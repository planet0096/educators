import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import Conversation from "@/models/Conversation";
import WhatsAppConfig from "@/models/WhatsAppConfig";
import mongoose from "mongoose";


// POST /api/whatsapp/conversations/sync
// Reassigns ALL Conversation + ChatMessage documents to the current session user
// This fixes educatorId mismatches caused by the WhatsAppConfig.user referencing a different user
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const correctEducatorId = new mongoose.Types.ObjectId(session.user.id);

        // Count ALL docs in collections (unfiltered)
        const totalConvs = await Conversation.countDocuments({});
        const totalMsgs = await ChatMessage.countDocuments({});

        if (totalConvs === 0 && totalMsgs === 0) {
            return NextResponse.json({
                success: true,
                synced: 0,
                message: "Collections are empty — no documents to reassign. Messages may still be in flight or the Meta webhook is not yet configured."
            });
        }

        // Reassign ALL Conversation docs to the correct educatorId
        const convResult = await Conversation.updateMany(
            { educatorId: { $ne: correctEducatorId } },
            { $set: { educatorId: correctEducatorId } }
        );

        // Reassign ALL ChatMessage docs to the correct educatorId
        const msgResult = await ChatMessage.updateMany(
            { educatorId: { $ne: correctEducatorId } },
            { $set: { educatorId: correctEducatorId } }
        );

        // Also fix WhatsAppConfig.user so the webhook saves with correct educatorId future
        await WhatsAppConfig.updateMany(
            { user: { $ne: correctEducatorId } },
            { $set: { user: correctEducatorId } }
        );

        // Fetch the now-correct conversations
        const conversations = await Conversation.find({ educatorId: correctEducatorId })
            .sort({ lastMessageAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            reassigned: {
                conversations: convResult.modifiedCount,
                messages: msgResult.modifiedCount,
            },
            conversations,
            message: `✅ Reassigned ${convResult.modifiedCount} conversation(s) and ${msgResult.modifiedCount} message(s) to your account. WhatsApp config also fixed for future messages.`
        });

    } catch (error: any) {
        console.error("[Conversations Sync Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET /api/whatsapp/conversations/sync
// Debug: returns ALL counts without filter + filtered counts to diagnose mismatch
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const sessionId = session.user.id;

        // Counts WITH educatorId filter
        const [convCountFiltered, chatMsgCountFiltered] = await Promise.all([
            Conversation.countDocuments({ educatorId: sessionId }),
            ChatMessage.countDocuments({ educatorId: sessionId })
        ]);

        // Counts WITHOUT filter (all docs in collection)
        const [convCountAll, chatMsgCountAll] = await Promise.all([
            Conversation.countDocuments({}),
            ChatMessage.countDocuments({})
        ]);

        // Sample first 3 ChatMessage docs (unfiltered) to see what educatorId is stored
        const sampleMessages = await ChatMessage.find({}).limit(3).lean();
        const sampleConvs = await Conversation.find({}).limit(3).lean();

        // Also get conversations matching session user
        const conversations = await Conversation.find({ educatorId: sessionId }).sort({ lastMessageAt: -1 }).lean();

        return NextResponse.json({
            success: true,
            sessionUserId: sessionId,
            filtered: {
                conversationCount: convCountFiltered,
                chatMessageCount: chatMsgCountFiltered,
            },
            total: {
                conversationCount: convCountAll,
                chatMessageCount: chatMsgCountAll,
            },
            sampleChatMessages: sampleMessages.map(m => ({
                _id: m._id,
                educatorId: m.educatorId,
                direction: m.direction,
                body: m.body?.slice(0, 50),
                timestamp: m.timestamp
            })),
            sampleConversations: sampleConvs.map(c => ({
                _id: c._id,
                educatorId: c.educatorId,
                contactPhone: c.contactPhone,
                lastMessage: c.lastMessage?.slice(0, 50)
            })),
            // For backward compat with ChatTab
            conversationCount: convCountFiltered,
            chatMessageCount: chatMsgCountFiltered,
            conversations
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
