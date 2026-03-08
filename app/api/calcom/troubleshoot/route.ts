import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComWebhookLog from "@/models/CalComWebhookLog";
import CalComIntegration from "@/models/CalComIntegration";

// GET /api/calcom/troubleshoot — fetch the raw webhook logs matching the user's Cal.com ID
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();

    // Find the user's Cal.com integration to know what payloads belong to them
    const integration = await CalComIntegration.findOne({ user: session.user.id });
    if (!integration) {
        return NextResponse.json({ success: true, logs: [], warning: "No Cal.com integration found." });
    }

    // We can filter logs by looking at payload.organizer.id or payload.user.id
    // This requires MongoDB array/nested matching against the integration.calComUserId
    const orQuery = [
        { "payload.organizer.id": integration.calComUserId },
        { "payload.user.id": integration.calComUserId },
        { "payload.organizer.username": integration.calComUsername },
        { "payload.user.username": integration.calComUsername }
    ];

    const logs = await CalComWebhookLog.find({ $or: orQuery })
        .sort({ receivedAt: -1 })
        .limit(20)
        .lean();

    return NextResponse.json({ success: true, logs });
}
