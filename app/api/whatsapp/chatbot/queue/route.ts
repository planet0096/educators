import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs";
import dbConnect from "@/lib/db";
import { processIncomingMessage } from "@/lib/chatbotEngine";
import WhatsAppConfig from "@/models/WhatsAppConfig";

// POST /api/whatsapp/chatbot/queue
// This route is called exclusively by Upstash QStash. It securely verifies the signature
// and processes the chatbot engine queue with guaranteed execution and retries.
async function handler(req: NextRequest) {
    try {
        const body = await req.json();
        const { educatorId, contactPhone, messageText } = body;

        console.log(`[QStash Consumer] Processing message for ${contactPhone}: "${messageText}"`);

        if (!educatorId || !contactPhone || !messageText) {
            console.error("[QStash Consumer Error] Missing required fields", body);
            // Return 400 so QStash doesn't keep retrying bad generic payloads
            return new NextResponse("Missing required fields", { status: 400 });
        }

        await dbConnect();

        // 1. Fetch WhatsApp config for this educator
        const config = await WhatsAppConfig.findOne({ user: educatorId });
        if (!config?.phoneNumberId || !config?.accessToken) {
            console.error(`[QStash Consumer Error] WhatsApp config missing for ${educatorId}`);
            return new NextResponse("WhatsApp configuration is missing.", { status: 400 });
        }

        // 2. Execute the Chatbot Engine reliably
        try {
            await processIncomingMessage(educatorId, contactPhone, messageText, config);
        } catch (engineError: any) {
            // If the Engine fails (e.g., Meta API 500 Network Error) we throw an error.
            // QStash intercepts any 500 response and will automatically retry the queue message.
            console.error("[Chatbot Engine Failure] Throwing 500 to trigger QStash Retry:", engineError);
            throw engineError;
        }

        // 3. Success -> Tell QStash to drop the message from the queue
        return NextResponse.json({ success: true, message: "Queue processed successfully" }, { status: 200 });

    } catch (error: any) {
        console.error("[QStash Consumer Error]:", error);
        return new NextResponse(`Internal server error: ${error.message}`, { status: 500 });
    }
}

// Ensure ONLY Upstash can call this URL by wrapping the handler in their cryptographic verifier
export const POST = verifySignatureAppRouter(handler);
