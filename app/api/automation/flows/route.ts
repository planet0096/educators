import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import AutomationFlow from "@/models/AutomationFlow";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await dbConnect();

        // Filter by source if provided
        // - ?source=calcom → exact match (only cal flows)
        // - ?source=chatbot → exclude cal flows (includes legacy flows with no source)
        const source = req.nextUrl.searchParams.get("source");
        const query: any = { educatorId: session.user.id };
        if (source === "calcom") {
            query.source = "calcom";
        } else if (source === "chatbot") {
            // Legacy flows were created without a source field — include those too
            query.source = { $nin: ["calcom"] };
        }

        const flows = await AutomationFlow.find(query).sort({ createdAt: -1 });

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
        const { name, description, triggerType, keywords, source } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        await dbConnect();

        const flow = await AutomationFlow.create({
            educatorId: session.user.id,
            name,
            description,
            source: source || "chatbot",
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
