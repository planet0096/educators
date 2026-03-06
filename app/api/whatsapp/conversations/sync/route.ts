import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import Conversation from "@/models/Conversation";
import mongoose from "mongoose";

// POST /api/whatsapp/conversations/sync
// Builds/repairs Conversation documents from existing ChatMessage records.
// Useful when messages arrived but conversations weren't created (e.g. model not yet deployed).
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const educatorId = new mongoose.Types.ObjectId(session.user.id);

        // Find all unique phones from ChatMessages for this educator
        const messages = await ChatMessage.find({ educatorId })
            .sort({ timestamp: 1 })
            .lean();

        if (messages.length === 0) {
            // No ChatMessage docs either — messages might be in AutomatedMessage
            return NextResponse.json({
                success: true,
                synced: 0,
                message: "No ChatMessage documents found. Messages may be in the AutomatedMessage collection (WooCommerce triggers), which are separate from the inbox."
            });
        }

        // Group messages by conversationId and derive phone/name
        const convMap = new Map<string, typeof messages>();
        for (const msg of messages) {
            const key = String(msg.conversationId);
            if (!convMap.has(key)) convMap.set(key, []);
            convMap.get(key)!.push(msg);
        }

        let synced = 0;

        // For each conversationId, upsert a Conversation document
        for (const [convIdStr, msgs] of convMap.entries()) {
            const lastMsg = msgs[msgs.length - 1];

            // Get phone from an inbound message; fallback to outbound
            const inbound = msgs.find(m => m.direction === "inbound");
            const phone = inbound?.body ?? lastMsg.body;

            // Try to find existing conversation
            const existingConv = await Conversation.findById(convIdStr);
            if (existingConv) {
                // Repair lastMessage if stale
                await Conversation.findByIdAndUpdate(convIdStr, {
                    $set: {
                        lastMessage: lastMsg.body,
                        lastMessageAt: lastMsg.timestamp,
                        educatorId
                    }
                });
            } else {
                // Conversation doc missing — recreate it
                try {
                    await Conversation.create({
                        _id: new mongoose.Types.ObjectId(convIdStr),
                        educatorId,
                        contactPhone: inbound ? "unknown" : "unknown",
                        contactName: "Synced Contact",
                        lastMessage: lastMsg.body,
                        lastMessageAt: lastMsg.timestamp,
                        unreadCount: msgs.filter(m => m.direction === "inbound").length,
                        status: "open"
                    });
                    synced++;
                } catch (e: any) {
                    if (e.code !== 11000) throw e;
                }
            }
        }

        // Also return a list of all conversations now
        const conversations = await Conversation.find({ educatorId }).sort({ lastMessageAt: -1 }).lean();

        return NextResponse.json({
            success: true,
            synced,
            conversationsTotal: conversations.length,
            chatMessagesTotal: messages.length,
            conversations
        });

    } catch (error: any) {
        console.error("[Conversations Sync Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET /api/whatsapp/conversations/sync
// Debug: returns counts of Conversation and ChatMessage documents
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const educatorId = new mongoose.Types.ObjectId(session.user.id);

        const [convCount, chatMsgCount] = await Promise.all([
            Conversation.countDocuments({ educatorId }),
            ChatMessage.countDocuments({ educatorId })
        ]);

        const conversations = await Conversation.find({ educatorId }).sort({ lastMessageAt: -1 }).lean();

        return NextResponse.json({
            success: true,
            educatorId: session.user.id,
            conversationCount: convCount,
            chatMessageCount: chatMsgCount,
            conversations
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
