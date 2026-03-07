import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import AutomationFlow from "@/models/AutomationFlow";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await dbConnect();

        const flows = await AutomationFlow.find({ educatorId: session.user.id })
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, flows }, { status: 200 });

    } catch (error: any) {
        console.error("[Automation Flows GET Error]:", error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { name, description, triggerType, keywords } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        await dbConnect();

        const flow = await AutomationFlow.create({
            educatorId: session.user.id,
            name,
            description,
            triggerType: triggerType || "keyword",
            keywords: keywords || [],
            isActive: false,
            flowData: { nodes: [], edges: [] }
        });

        return NextResponse.json({ success: true, flow }, { status: 201 });

    } catch (error: any) {
        console.error("[Automation Flows POST Error]:", error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
