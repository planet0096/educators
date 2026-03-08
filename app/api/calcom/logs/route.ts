import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComLog from "@/models/CalComLog";

// GET /api/calcom/logs — fetch execution history for the current educator
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await dbConnect();

    // Fetch all logs. We pull them sorted by executedAt desc.
    // 'scheduled' entries won't have executedAt yet so we rely on createdBy  (_id sort as fallback)
    const logs = await CalComLog.find({ educatorId: session.user.id })
        .sort({ executedAt: -1, _id: -1 })
        .limit(100)
        .lean();

    // Move "scheduled" (upcoming) entries to the very top so users see what's pending
    const upcoming = logs.filter((l: any) => l.status === "scheduled");
    const rest = logs.filter((l: any) => l.status !== "scheduled");

    return NextResponse.json({ success: true, logs: [...upcoming, ...rest] });
}
