import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import Conversation from "@/models/Conversation";
import WhatsAppConfig from "@/models/WhatsAppConfig";

// GET /api/whatsapp/conversations/[id]/messages
// Returns messages for a conversation
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;

        await dbConnect();

        const conversation = await Conversation.findOne({ _id: id, educatorId: session.user.id });
        if (!conversation) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const messages = await ChatMessage.find({ conversationId: id })
            .sort({ timestamp: 1 })
            .limit(200)
            .lean();

        return NextResponse.json({ success: true, messages, conversation });
    } catch (error: any) {
        console.error("[Messages GET Error]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/whatsapp/conversations/[id]/messages
// Send a text or template message to a conversation
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await req.json();
        const { type, text, templateName, templateLanguage, templateComponents } = body;

        await dbConnect();

        const [conversation, config] = await Promise.all([
            Conversation.findOne({ _id: id, educatorId: session.user.id }),
            WhatsAppConfig.findOne({ user: session.user.id })
        ]);

        if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        if (!config?.phoneNumberId || !config?.accessToken) {
            return NextResponse.json({ error: "WhatsApp not configured" }, { status: 400 });
        }

        const apiUrl = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;

        // Build the Meta API payload
        let metaPayload: Record<string, unknown>;

        if (type === "text") {
            metaPayload = {
                messaging_product: "whatsapp",
                to: conversation.contactPhone,
                type: "text",
                text: { body: text }
            };
        } else if (type === "template") {
            metaPayload = {
                messaging_product: "whatsapp",
                to: conversation.contactPhone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: templateLanguage || "en_US" },
                    ...(templateComponents?.length > 0 && { components: templateComponents })
                }
            };
        } else {
            return NextResponse.json({ error: "Unsupported message type" }, { status: 400 });
        }

        // Send via Meta Cloud API
        const metaRes = await fetch(apiUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(metaPayload)
        });

        const metaData = await metaRes.json();

        if (!metaRes.ok || !metaData.messages?.[0]?.id) {
            return NextResponse.json(
                { error: metaData.error?.message || "Meta API Error" },
                { status: 400 }
            );
        }

        const wamId = metaData.messages[0].id;
        const now = new Date();
        const bodyPreview = type === "text" ? text : `[Template: ${templateName}]`;

        // Save to DB
        const message = await ChatMessage.create({
            educatorId: session.user.id,
            conversationId: conversation._id,
            wamId,
            direction: "outbound",
            type,
            body: bodyPreview,
            templateName: type === "template" ? templateName : undefined,
            status: "sent",
            timestamp: now,
        });

        // Update conversation last message
        await Conversation.findByIdAndUpdate(id, {
            $set: { lastMessage: bodyPreview, lastMessageAt: now }
        });

        return NextResponse.json({ success: true, message });
    } catch (error: any) {
        console.error("[Messages POST Error]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
