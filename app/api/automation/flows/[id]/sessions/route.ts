import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import AutomationSession from "@/models/AutomationSession";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await dbConnect();

        // Ensure params are available
        const { id } = await context.params;

        if (!id) {
            return new NextResponse("Missing flow ID", { status: 400 });
        }

        // Fetch recent sessions for this flow
        const sessions = await AutomationSession.find({
            educatorId: session.user.id,
            flowId: id
        })
            .sort({ updatedAt: -1 })
            .limit(50);

        return NextResponse.json({ success: true, sessions });

    } catch (error: any) {
        console.error("[Get Automation Sessions Error]", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
