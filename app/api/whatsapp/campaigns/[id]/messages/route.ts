import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Campaign from "@/models/Campaign";
import CampaignMessage from "@/models/CampaignMessage";
import Contact from "@/models/Contact";

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

        // Verify the campaign belongs to this user
        const campaign = await Campaign.findOne({ _id: id, educatorId: session.user.id }).select("_id").lean();

        if (!campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const status = url.searchParams.get("status");

        const query: any = { campaignId: id };
        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            CampaignMessage.find(query)
                .populate("contactId", "name email phone")
                .sort({ createdAt: 1 }) // Order in which they were queued
                .skip(skip)
                .limit(limit)
                .lean(),
            CampaignMessage.countDocuments(query)
        ]);

        return NextResponse.json({
            messages,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching Campaign Messages:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
