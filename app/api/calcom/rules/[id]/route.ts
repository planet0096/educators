import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComRule from "@/models/CalComRule";

// PATCH /api/calcom/rules/[id] - update (toggle active, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    await dbConnect();
    const rule = await CalComRule.findOneAndUpdate(
        { _id: id, educatorId: session.user.id },
        { $set: body },
        { new: true }
    );
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, rule });
}

// DELETE /api/calcom/rules/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await dbConnect();
    await CalComRule.deleteOne({ _id: id, educatorId: session.user.id });
    return NextResponse.json({ success: true });
}
