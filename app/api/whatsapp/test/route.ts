import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import WhatsAppConfig from "@/models/WhatsAppConfig";

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { recipientNumber, templateName, templateLanguage, components } = body;

        if (!recipientNumber || !templateName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();

        const config = await WhatsAppConfig.findOne({ user: session.user.id });
        if (!config) {
            return NextResponse.json({ error: "WhatsApp configuration not found" }, { status: 404 });
        }

        const { phoneNumberId, accessToken } = config;

        // Construct Facebook Graph API URL (v19.0 is a stable recent version)
        const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

        const payload = {
            messaging_product: "whatsapp",
            to: recipientNumber,
            type: "template",
            template: {
                name: templateName,
                language: {
                    code: templateLanguage || "en_US"
                },
                components: components || []
            }
        };

        console.log("Sending payload to Meta:", JSON.stringify(payload, null, 2));

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("WhatsApp API Error:", data);
            return NextResponse.json({ error: data.error?.message || "Failed to send message via WhatsApp setup" }, { status: response.status });
        }

        return NextResponse.json({ success: true, data }, { status: 200 });

    } catch (error: any) {
        console.error("Error sending test message:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
