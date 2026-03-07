import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Campaign from "@/models/Campaign";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
        }

        await dbConnect();

        const campaign = await Campaign.findOne({ _id: id, educatorId: session.user.id }).lean();

        if (!campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        return NextResponse.json({ campaign }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching Campaign detail:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/whatsapp/campaigns/[id]
// Allows pausing, resuming, or permanently stopping a campaign.
// The QStash consumer checks this status before sending each message.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { action } = body; // 'pause' | 'resume' | 'stop'

        const ALLOWED_TRANSITIONS: Record<string, string> = {
            pause: "paused",
            resume: "running",
            stop: "stopped",
        };

        const newStatus = ALLOWED_TRANSITIONS[action];
        if (!newStatus) {
            return NextResponse.json(
                { error: `Invalid action '${action}'. Use: pause, resume, or stop.` },
                { status: 400 }
            );
        }

        await dbConnect();

        const campaign = await Campaign.findOneAndUpdate(
            { _id: id, educatorId: session.user.id },
            { $set: { status: newStatus } },
            { new: true }
        );

        if (!campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        console.log(`[Campaign] ${action.toUpperCase()} → status: ${newStatus} for campaign ${id}`);
        return NextResponse.json({ success: true, campaign }, { status: 200 });

    } catch (error: any) {
        console.error("Error updating Campaign status:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
