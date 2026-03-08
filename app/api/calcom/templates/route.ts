import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import WhatsAppConfig from "@/models/WhatsAppConfig";

// GET /api/calcom/templates — fetches approved WA templates from Meta
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const waConfig = await WhatsAppConfig.findOne({ user: session.user.id });

    if (!waConfig?.wabaId || !waConfig?.accessToken) {
        return NextResponse.json({ error: "WhatsApp not configured. Set up WhatsApp CRM first." }, { status: 400 });
    }

    const res = await fetch(
        `https://graph.facebook.com/v19.0/${waConfig.wabaId}/message_templates?status=APPROVED&limit=50&fields=name,language,status,components`,
        {
            headers: { Authorization: `Bearer ${waConfig.accessToken}` },
        }
    );

    const data = await res.json();

    if (!res.ok) {
        console.error("[Templates API] Meta error:", data);
        return NextResponse.json({ error: data?.error?.message || "Failed to fetch templates" }, { status: 400 });
    }

    // Parse templates and extract their variable components
    const templates = (data.data || []).map((t: any) => {
        const bodyComponent = t.components?.find((c: any) => c.type === "BODY");
        const text = bodyComponent?.text || "";
        // Count variable slots e.g. {{1}}, {{2}}, {{3}}
        const variableCount = (text.match(/\{\{\d+\}\}/g) || []).length;
        return {
            name: t.name,
            language: t.language,
            status: t.status,
            bodyText: text,
            variableCount,
        };
    });

    return NextResponse.json({ success: true, templates });
}
