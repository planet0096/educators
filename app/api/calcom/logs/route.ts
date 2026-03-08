import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComLog from "@/models/CalComLog";

// GET /api/calcom/logs — fetch execution history for the current educator
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await dbConnect();
    const logs = await CalComLog.find({ educatorId: session.user.id })
        .sort({ executedAt: -1 })
        .limit(100)
        .lean();
    return NextResponse.json({ success: true, logs });
}
