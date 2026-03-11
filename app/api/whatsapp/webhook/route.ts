import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import WhatsAppConfig from "@/models/WhatsAppConfig";
import Conversation from "@/models/Conversation";
import ChatMessage from "@/models/ChatMessage";
import WebhookLog from "@/models/WebhookLog";
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN || "" });

// ─── GET: Meta webhook verification ──────────────────────────────────────────
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
        console.log("[WhatsApp Webhook] Verification successful");
        return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST: Receive incoming messages & status updates ─────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        await dbConnect();

        // Log the raw payload
        let logId: string | null = null;
        try {
            const logDoc = await WebhookLog.create({ payload: body });
            logId = logDoc._id.toString();
        } catch (e) {
            console.error("Failed to save WebhookLog", e);
        }

        // Quickly ACK Meta — must return 200 within 20s
        // We process asynchronously below
        const entries = body?.entry ?? [];

        await dbConnect();

        for (const entry of entries) {
            for (const change of entry.changes ?? []) {
                if (change.field !== "messages") continue;

                const value = change.value;
                const metadata = value?.metadata; // contains phone_number_id
                const phoneNumberId = metadata?.phone_number_id;

                if (!phoneNumberId) continue;

                // Find ALL educators who own this phone number ID (e.g. Meta test numbers)
                const configs = await WhatsAppConfig.find({ phoneNumberId });
                if (!configs || configs.length === 0) continue;

                // Default to the first config
                let targetConfig = configs[0];

                // ── Handle incoming messages ────────────────────────────────
                for (const msg of value?.messages ?? []) {
                    const type = msg.type ?? "unknown";
                    let body_text = "";
                    
                    if (type === "text") {
                        body_text = msg.text?.body ?? "";
                    } else if (msg.interactive) {
                        const inter = msg.interactive;
                        if (inter.type === "button_reply") body_text = inter.button_reply?.title || "";
                        else if (inter.type === "list_reply") body_text = inter.list_reply?.title || "";
                    }

                    const contactPhone = msg.from?.replace(/[\+\s\-]/g, "") || "";

                    // If multiple configs share the same number, try to route to the one with an active flow for this keyword
                    if (configs.length > 1 && body_text && contactPhone) {
                        const SearchText = body_text.toLowerCase().trim();
                        
                        // We will dynamically query to see which config actually owns the trigger or active session
                        const mongoose = require('mongoose');
                        const AutomationFlow = mongoose.models.AutomationFlow || mongoose.model('AutomationFlow');
                        const AutomationSession = mongoose.models.AutomationSession || mongoose.model('AutomationSession');
                        
                        let foundOwner = false;

                        // 1. Check if any educator has an active session for this contact
                        for (const c of configs) {
                            const activeSession = await AutomationSession.findOne({ educatorId: c.user, contactPhone, status: "active" });
                            if (activeSession) {
                                targetConfig = c;
                                foundOwner = true;
                                break;
                            }
                        }

                        // 2. If no active session is found, check for keyword triggers
                        if (!foundOwner) {
                            for (const c of configs) {
                                const flows = await AutomationFlow.find({ educatorId: c.user, isActive: true });
                                for (const flow of flows) {
                                    if (flow.triggerType === "catch_all") {
                                        targetConfig = c; // Fallback to catch-all
                                    } else if (flow.triggerType === "keyword" && flow.keywords) {
                                        let keywordList: string[] = [];
                                        if (Array.isArray(flow.keywords)) keywordList = flow.keywords;
                                        else if (typeof flow.keywords === "string") keywordList = flow.keywords.split(",").map((k: string) => k.trim());
                                        
                                        if (keywordList.some(k => SearchText.includes(k.toLowerCase().trim()))) {
                                            targetConfig = c;
                                            foundOwner = true;
                                            break;
                                        }
                                    }
                                }
                                if (foundOwner) break;
                            }
                        }
                    }

                    const educatorId = targetConfig.user;
                    const config = targetConfig;
                    const wamId = msg.id;
                    const ts = new Date(parseInt(msg.timestamp) * 1000);

                    // Extract message body (type and body_text are already declared)
                    let mediaUrl = "";
                    let mimeType = "";

                    if (type === "text") {
                        body_text = msg.text?.body ?? "";
                    } else if (["image", "video", "audio", "document", "sticker"].includes(type)) {
                        const mediaObj = msg[type];
                        mimeType = mediaObj?.mime_type ?? "";
                        // Media needs a separate API call to get URL — store the ID for now
                        body_text = `[${type}]`;
                        mediaUrl = mediaObj?.id ?? "";
                    } else if (type === "reaction") {
                        body_text = msg.reaction?.emoji ?? "[reaction]";
                    } else if (type === "interactive") {
                        const inter = msg.interactive;
                        if (inter?.type === "nfm_reply") {
                            body_text = inter.nfm_reply?.response_json || "{}";
                        } else if (inter?.type === "button_reply") {
                            body_text = inter.button_reply?.title || "[Button Reply]";
                        } else if (inter?.type === "list_reply") {
                            body_text = inter.list_reply?.title || "[List Reply]";
                        } else {
                            body_text = "[Interactive Message]";
                        }
                    } else {
                        body_text = `[${type}]`;
                    }

                    // Get contact name from contacts array if provided
                    const contactProfile = value?.contacts?.find((c: any) => c.wa_id === contactPhone);
                    const contactName = contactProfile?.profile?.name ?? contactPhone;

                    // Upsert conversation
                    const conversation = await Conversation.findOneAndUpdate(
                        { educatorId, contactPhone },
                        {
                            $set: { contactName, lastMessage: body_text, lastMessageAt: ts },
                            $inc: { unreadCount: 1 },
                            $setOnInsert: { status: "open" }
                        },
                        { upsert: true, new: true }
                    );

                    // Save the chat message (avoid duplicates via wamId uniqueness)
                    try {
                        await ChatMessage.create({
                            educatorId,
                            conversationId: conversation._id,
                            wamId,
                            direction: "inbound",
                            type,
                            body: body_text,
                            mediaUrl,
                            mimeType,
                            status: "delivered",
                            timestamp: ts,
                        });

                        // Push to QStash queue instead of an unreliable detached fetch
                        // This ensures 100% execution guarantee even if Vercel serverless functions time out.
                        if (process.env.QSTASH_TOKEN) {
                            // Extract base URL from request in case NEXTAUTH_URL is localhost (e.g., when testing via ngrok)
                            const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
                            const protoHeader = req.headers.get("x-forwarded-proto") || "https";
                            const reqOrigin = hostHeader ? `${protoHeader}://${hostHeader}` : req.nextUrl.origin;
                            
                            let targetBase = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                            if (targetBase.includes("localhost") && !reqOrigin.includes("localhost")) {
                                targetBase = reqOrigin;
                            }

                            try {
                                const qstashResp = await qstash.publishJSON({
                                    url: `${targetBase}/api/whatsapp/chatbot/queue`,
                                    body: {
                                        educatorId: educatorId.toString(),
                                        contactPhone,
                                        messageText: body_text
                                    },
                                    retries: 3
                                });
                                console.log("[QStash Publish Success]", qstashResp);
                                await WebhookLog.create({ payload: { qstash_success: true, target: `${targetBase}/api/whatsapp/chatbot/queue`, response: qstashResp } });
                            } catch (qErr: any) {
                                console.error("[QStash Publish Error]", qErr);
                                await WebhookLog.create({ payload: { qstash_error: true, message: qErr.message, target: `${targetBase}/api/whatsapp/chatbot/queue` } });
                            }
                        } else {
                            console.warn("⚠️ QSTASH_TOKEN is missing. Chatbot engine will not process messages.");
                        }
                    } catch (dupErr: any) {
                        if (dupErr.code !== 11000) throw dupErr; // ignore duplicate wamId
                    }
                }

                // ── Handle message status updates ───────────────────────────
                for (const statusUpdate of value?.statuses ?? []) {
                    const wamId = statusUpdate.id;
                    const status = statusUpdate.status; // sent | delivered | read | failed

                    await ChatMessage.findOneAndUpdate(
                        { wamId },
                        { $set: { status } }
                    );
                }
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error("[WhatsApp Webhook Error]:", error);

        try {
            await dbConnect();
            await WebhookLog.create({ error: error.message, payload: { error: "Caught in outer catch" } });
        } catch (e) { }

        // Always return 200 so Meta doesn't disable the webhook
        return NextResponse.json({ success: false }, { status: 200 });
    }
}
