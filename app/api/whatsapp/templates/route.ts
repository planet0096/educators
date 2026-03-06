import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import WhatsAppConfig from "@/models/WhatsAppConfig";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const config = await WhatsAppConfig.findOne({ user: session.user.id });
        if (!config || !config.wabaId || !config.accessToken) {
            return NextResponse.json({ error: "WhatsApp Cloud API configuration is incomplete." }, { status: 404 });
        }

        const { wabaId, accessToken } = config;

        // Fetch templates from Meta Graph API
        const apiUrl = `https://graph.facebook.com/v19.0/${wabaId}/message_templates?status=APPROVED`;

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("WhatsApp Templates API Error:", data);
            return NextResponse.json({ error: data.error?.message || "Failed to fetch templates" }, { status: response.status });
        }

        return NextResponse.json({ success: true, templates: data.data || [] }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching templates:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
