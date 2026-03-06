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
