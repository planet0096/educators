import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import WhatsAppConfig from "@/models/WhatsAppConfig";
import Conversation from "@/models/Conversation";
import ChatMessage from "@/models/ChatMessage";
import WebhookLog from "@/models/WebhookLog";

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

                // Find which educator owns this phone number ID
                const config = await WhatsAppConfig.findOne({ phoneNumberId });
                if (!config) continue;

                const educatorId = config.user;

                // ── Handle incoming messages ────────────────────────────────
                for (const msg of value?.messages ?? []) {
                    // normalize phone number (strip + and spaces)
                    const contactPhone = msg.from?.replace(/[\+\s\-]/g, "") || "";
                    const wamId = msg.id;
                    const ts = new Date(parseInt(msg.timestamp) * 1000);

                    // Extract message body
                    let type: string = msg.type ?? "unknown";
                    let body_text = "";
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
