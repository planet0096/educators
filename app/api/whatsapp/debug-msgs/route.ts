import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import Conversation from "@/models/Conversation";

export const dynamic = "force-dynamic";

export async function GET() {
    await dbConnect();

    // Dump newest 10 inbound messages
    const msgs = await ChatMessage.find({ direction: "inbound" })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

    // Dump newest 5 conversations
    const convs = await Conversation.find()
        .sort({ lastMessageAt: -1 })
        .limit(5)
        .lean();

    return NextResponse.json({
        messagesCount: msgs.length,
        recentMessages: msgs.map(m => ({ id: m._id, body: m.body, from: m.contactPhone, educatorId: m.educatorId })),
        conversations: convs.map(c => ({ id: c._id, educatorId: c.educatorId, phone: c.contactPhone, msgs: c.lastMessage }))
    });
}
