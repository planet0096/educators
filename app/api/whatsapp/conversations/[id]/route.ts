import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Conversation from "@/models/Conversation";

// PATCH /api/whatsapp/conversations/[id]
// Mark as read or archive
export async function PATCH(
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

        await dbConnect();

        const update: Record<string, unknown> = {};
        if (body.markRead) update.unreadCount = 0;
        if (body.status) update.status = body.status;

        const conversation = await Conversation.findOneAndUpdate(
            { _id: id, educatorId: session.user.id },
            { $set: update },
            { new: true }
        );

        if (!conversation) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, conversation });
    } catch (error: any) {
        console.error("[Conversation PATCH Error]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
