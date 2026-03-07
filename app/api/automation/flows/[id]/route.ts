import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import AutomationFlow from "@/models/AutomationFlow";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return new NextResponse("Invalid Flow ID", { status: 400 });
        }

        await dbConnect();

        const flow = await AutomationFlow.findOne({
            _id: id,
            educatorId: session.user.id
        });

        if (!flow) {
            return new NextResponse("Flow not found", { status: 404 });
        }

        return NextResponse.json({ success: true, flow }, { status: 200 });

    } catch (error: any) {
        console.error("[Automation Flow GET Error]:", error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return new NextResponse("Invalid Flow ID", { status: 400 });
        }

        const body = await req.json();

        await dbConnect();

        const flow = await AutomationFlow.findOneAndUpdate(
            { _id: id, educatorId: session.user.id },
            { $set: body },
            { new: true }
        );

        if (!flow) {
            return new NextResponse("Flow not found", { status: 404 });
        }

        return NextResponse.json({ success: true, flow }, { status: 200 });

    } catch (error: any) {
        console.error("[Automation Flow PATCH Error]:", error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return new NextResponse("Invalid Flow ID", { status: 400 });
        }

        await dbConnect();

        const flow = await AutomationFlow.findOneAndDelete({
            _id: id,
            educatorId: session.user.id
        });

        if (!flow) {
            return new NextResponse("Flow not found", { status: 404 });
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error("[Automation Flow DELETE Error]:", error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
