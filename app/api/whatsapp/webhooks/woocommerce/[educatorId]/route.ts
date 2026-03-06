import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import WooCommerceIntegration from "@/models/WooCommerceIntegration";
import AutomatedMessage from "@/models/AutomatedMessage";
import Contact from "@/models/Contact";
import mongoose from "mongoose";

// Helper safely extracting nested objects by string path (e.g. 'billing.first_name')
const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ educatorId: string }> }
) {
    try {
        const { educatorId } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(educatorId)) {
            return new NextResponse("Invalid Educator ID", { status: 400 });
        }

        const rawBody = await req.text(); // Need raw body for HMAC verification

        const signature = req.headers.get("x-wc-webhook-signature");
        const event = req.headers.get("x-wc-webhook-event") || "";
        const resource = req.headers.get("x-wc-webhook-resource") || "";
        const topic = req.headers.get("x-wc-webhook-topic") || "";
        const fullEventName = `${resource}.${event}`;

        // Handle the initial webhook creation ping from WooCommerce
        if (topic === "action.woocommerce_api_create_webhook" || topic === "webhook.ping") {
            return new NextResponse("Webhook integration confirmed", { status: 200 });
        }

        await dbConnect();

        // 1. Fetch Integration Settings
        const integration = await WooCommerceIntegration.findOne({
            educatorId: new mongoose.Types.ObjectId(educatorId),
            isEnabled: true
        });

        if (!integration) {
            return new NextResponse("Integration disabled or not found", { status: 404 });
        }

        // 2. Verify HMAC-SHA256 Signature
        if (signature) {
            const hash = crypto
                .createHmac("sha256", integration.webhookSecret)
                .update(rawBody, "utf8")
                .digest("base64");

            if (hash !== signature) {
                console.error(`[WooCommerce Webhook] Invalid signature for ${educatorId}. Expected: ${hash}, Got: ${signature}`);
                return new NextResponse("Invalid Webhook Signature", { status: 401 });
            }
        }

        // 3. Find matching active triggers
        const matchingTriggers = integration.triggers.filter((t: any) =>
            t.event === fullEventName && t.isActive
        );

        if (matchingTriggers.length === 0) {
            // Unhandled event, perfectly normal. Just return 200 to acknowledge.
            return new NextResponse("Event acknowledged (No active triggers)", { status: 200 });
        }

        // 4. Parse payload and process messages
        let payload: any;
        try {
            payload = JSON.parse(rawBody);
        } catch (e) {
            return new NextResponse("Invalid JSON payload", { status: 400 });
        }

        // Attempt to extract the phone number from standard WC locations
        let phoneNumber = payload?.billing?.phone || payload?.shipping?.phone || payload?.phone;

        if (!phoneNumber) {
            // Cannot send WhatsApp message without a phone number
            return new NextResponse("Payload missing phone number", { status: 200 });
        }

        // Clean phone number (strip non-digits)
        phoneNumber = phoneNumber.replace(/\D/g, '');

        // 5. Create AutomatedMessage queue items for each matching trigger
        const messagesToQueue = [];

        for (const trigger of matchingTriggers) {
            // Build dynamic variables
            const templateVariables = new Map<string, string>();

            if (trigger.variableMapping) {
                for (const [varName, jsonPath] of Object.entries(trigger.variableMapping.toObject() || {})) {
                    // Extract the value from the payload using the jsonPath (e.g. 'billing.first_name')
                    const extractedValue = getNestedValue(payload, jsonPath as string);
                    if (extractedValue !== undefined && extractedValue !== null) {
                        templateVariables.set(varName, String(extractedValue));
                    }
                }
            }

            messagesToQueue.push({
                educatorId: integration.educatorId,
                integration: "woocommerce",
                triggerId: trigger._id,
                phone: phoneNumber,
                templateName: trigger.templateName,
                templateLanguage: trigger.templateLanguage,
                templateVariables: templateVariables,
                status: "pending",
                payloadTimestamp: new Date(),
            });
        }

        if (messagesToQueue.length > 0) {
            await AutomatedMessage.insertMany(messagesToQueue);
            console.log(`[WooCommerce Webhook] Queued ${messagesToQueue.length} automated messages for ${educatorId}`);

            // Fire-and-forget: Trigger the queue processor without waiting for it.
            // This ensures messages are sent almost instantly while we return 200 to WooCommerce immediately.
            const processorUrl = `${req.nextUrl.origin}/api/whatsapp/automations/process`;
            fetch(processorUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Forward the original cookies so auth() can extract the session
                    "Cookie": req.headers.get("cookie") || ""
                },
                body: JSON.stringify({ educatorId })
            }).catch((err) => {
                console.error("[WooCommerce Webhook] Failed to trigger automation processor:", err.message);
            });
        }

        // Return 200 immediately so WooCommerce doesn't retry
        return new NextResponse("Webhook processed successfully", { status: 200 });

    } catch (error: any) {
        console.error("[WooCommerce Webhook Endpoint Error]:", error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
