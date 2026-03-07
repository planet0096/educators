import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { processIncomingMessage } from "@/lib/chatbotEngine";
import WhatsAppConfig from "@/models/WhatsAppConfig";

// POST /api/whatsapp/chatbot/process
// Invoked asynchronously by the Webhook handler to process chatbot flows without holding up the Meta 200 OK response.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { educatorId, contactPhone, messageText } = body;

        console.log(`[Chatbot Queue] Received payload for ${contactPhone}: "${messageText}"`);

        if (!educatorId || !contactPhone || !messageText) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        await dbConnect();

        // 1. Fetch WhatsApp config for this educator
        const config = await WhatsAppConfig.findOne({ user: educatorId });
        if (!config?.phoneNumberId || !config?.accessToken) {
            return new NextResponse("WhatsApp configuration is missing.", { status: 400 });
        }

        // 2. Execute the Chatbot Engine
        await processIncomingMessage(educatorId, contactPhone, messageText, config);

        return NextResponse.json({ success: true, message: "Engine processed successfully" }, { status: 200 });

    } catch (error: any) {
        console.error("[Chatbot Process Queue Error]:", error);
        return new NextResponse(`Internal server error: ${error.message}`, { status: 500 });
    }
}
