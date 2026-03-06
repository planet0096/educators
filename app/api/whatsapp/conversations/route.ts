import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Conversation from "@/models/Conversation";
import mongoose from "mongoose";

// GET /api/whatsapp/conversations
// Returns all conversations sorted by most recent message
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = req.nextUrl;
        const status = searchParams.get("status") || "open";

        // Match by both ObjectId and string forms to handle type mismatches
        let educatorIdQuery: any;
        try {
            const oid = new mongoose.Types.ObjectId(session.user.id);
            educatorIdQuery = { $in: [oid, session.user.id] };
        } catch {
            educatorIdQuery = session.user.id;
        }

        const conversations = await Conversation.find({
            educatorId: educatorIdQuery,
            status
        })
            .sort({ lastMessageAt: -1 })
            .limit(100)
            .lean();

        return NextResponse.json({ success: true, conversations });
    } catch (error: any) {
        console.error("[Conversations GET Error]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
