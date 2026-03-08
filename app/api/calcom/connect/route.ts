import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComIntegration from "@/models/CalComIntegration";

// POST /api/calcom/connect - Save Cal.com API key
export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { apiKey } = await req.json();

        if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
            return NextResponse.json({ error: "A valid Cal.com API key is required." }, { status: 400 });
        }

        // Validate the key by calling Cal.com's /me endpoint
        const meRes = await fetch(`https://api.cal.com/v1/me?apiKey=${apiKey.trim()}`);
        const meData = await meRes.json();

        if (!meRes.ok || !meData?.user) {
            return NextResponse.json({
                error: "Invalid API key. Please check it and try again."
            }, { status: 400 });
        }

        const calComUserId = meData.user.id;
        const calComUsername = meData.user.username || meData.user.email || "Connected";

        // Save to database
        await dbConnect();

        await CalComIntegration.findOneAndUpdate(
            { user: session.user.id },
            {
                user: session.user.id,
                apiKey: apiKey.trim(),
                calComUserId: calComUserId,
                calComUsername: calComUsername,
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            username: calComUsername
        });
    } catch (err: any) {
        console.error("[CalCom Connect] Error:", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}

// DELETE /api/calcom/connect - Disconnect Cal.com
export async function DELETE() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        await CalComIntegration.deleteOne({ user: session.user.id });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[CalCom Disconnect] Error:", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
