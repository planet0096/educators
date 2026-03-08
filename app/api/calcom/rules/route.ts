import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComRule from "@/models/CalComRule";

// GET /api/calcom/rules - list all rules
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await dbConnect();
    const rules = await CalComRule.find({ educatorId: session.user.id }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, rules });
}

// POST /api/calcom/rules - create a rule
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { name, triggerType, templateName, languageCode, variableMappings } = body;
    if (!name || !triggerType || !templateName) {
        return NextResponse.json({ error: "name, triggerType, and templateName are required" }, { status: 400 });
    }
    await dbConnect();
    const rule = await CalComRule.create({
        educatorId: session.user.id,
        name,
        triggerType,
        templateName,
        languageCode: languageCode || "en_US",
        variableMappings: variableMappings || [],
        isActive: true,
    });
    return NextResponse.json({ success: true, rule }, { status: 201 });
}
