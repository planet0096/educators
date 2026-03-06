import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Conversation from "@/models/Conversation";

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

        const conversations = await Conversation.find({
            educatorId: session.user.id,
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
