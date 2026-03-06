import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import Conversation from "@/models/Conversation";
import WhatsAppConfig from "@/models/WhatsAppConfig";
import WebhookLog from "@/models/WebhookLog";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await dbConnect();

        const msgs = await ChatMessage.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .lean();

        const convs = await Conversation.find()
            .sort({ lastMessageAt: -1 })
            .limit(5)
            .lean();

        const configs = await WhatsAppConfig.find().lean();

        const logs = await WebhookLog.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        return NextResponse.json({
            webhookLogs: logs,
            configs: configs.map(c => ({ id: c._id, user: c.user, phoneId: c.phoneNumberId })),
            latestMessages: msgs.map(m => ({
                id: m._id,
                direction: m.direction,
                wamId: m.wamId,
                body: m.body?.slice(0, 30),
                from_educator: m.educatorId,
                conv: m.conversationId,
                time: m.timestamp
            })),
            latestConversations: convs.map(c => ({
                id: c._id,
                phone: c.contactPhone,
                educator: c.educatorId,
                unread: c.unreadCount,
                last: c.lastMessage?.slice(0, 30)
            }))
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
