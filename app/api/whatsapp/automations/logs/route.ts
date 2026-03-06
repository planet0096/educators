import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import AutomatedMessage from "@/models/AutomatedMessage";

// GET /api/whatsapp/automations/logs
// Returns recent automated messages for the logged-in educator
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = req.nextUrl;
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const status = searchParams.get("status") || undefined;

        const query: Record<string, unknown> = { educatorId: session.user.id };
        if (status) query.status = status;

        const messages = await AutomatedMessage.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ success: true, messages });

    } catch (error: any) {
        console.error("[Automation Logs API Error]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
