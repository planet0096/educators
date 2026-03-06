import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import WooCommerceIntegration from "@/models/WooCommerceIntegration";
import AutomatedMessage from "@/models/AutomatedMessage";
import WhatsAppConfig from "@/models/WhatsAppConfig";
import mongoose from "mongoose";

// Helper safely extracting nested objects by dot-path (e.g. 'billing.first_name')
const getNestedValue = (obj: any, path: string): string | undefined => {
    const val = path.split('.').reduce((acc: any, part) => acc && acc[part], obj);
    return val !== undefined && val !== null ? String(val) : undefined;
};

// Build WhatsApp template components from the variable map stored in a trigger
function buildComponents(vars: Record<string, string>): any[] {
    const components: any[] = [];
    const bodyParams: (any | undefined)[] = [];
    const headerParams: (any | undefined)[] = [];

    for (const [key, value] of Object.entries(vars)) {
        if (key.startsWith("BODY_")) {
            const idx = parseInt(key.replace("BODY_", ""), 10) - 1;
            bodyParams[idx] = { type: "text", text: value ?? "" };
        } else if (key.startsWith("HEADER_")) {
            const idx = parseInt(key.replace("HEADER_", ""), 10) - 1;
            if (!isNaN(idx)) headerParams[idx] = { type: "text", text: value ?? "" };
        }
    }

    if (headerParams.filter(Boolean).length > 0) components.push({ type: "header", parameters: headerParams.filter(Boolean) });
    if (bodyParams.filter(Boolean).length > 0) components.push({ type: "body", parameters: bodyParams.filter(Boolean) });

    return components;
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ educatorId: string }> }
) {
    try {
        const { educatorId } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(educatorId)) {
            return new NextResponse("Invalid Educator ID", { status: 400 });
        }

        const rawBody = await req.text();

        const signature = req.headers.get("x-wc-webhook-signature");
        const event = req.headers.get("x-wc-webhook-event") || "";
        const resource = req.headers.get("x-wc-webhook-resource") || "";
        const topic = req.headers.get("x-wc-webhook-topic") || "";
        const fullEventName = `${resource}.${event}`;

        // Immediately acknowledge WooCommerce's initial validation ping
        if (topic === "action.woocommerce_api_create_webhook" || topic === "webhook.ping") {
            return new NextResponse("Webhook integration confirmed", { status: 200 });
        }

        await dbConnect();

        // 1. Fetch Integration Settings + WhatsApp Config together
        const [integration, whatsappConfig] = await Promise.all([
            WooCommerceIntegration.findOne({
                educatorId: new mongoose.Types.ObjectId(educatorId),
                isEnabled: true
            }),
            WhatsAppConfig.findOne({ user: new mongoose.Types.ObjectId(educatorId) })
        ]);

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
                console.error(`[WooCommerce Webhook] Invalid signature for ${educatorId}`);
                return new NextResponse("Invalid Webhook Signature", { status: 401 });
            }
        }

        // 3. Find matching active triggers
        const matchingTriggers = integration.triggers.filter(
            (t: any) => t.event === fullEventName && t.isActive
        );

        if (matchingTriggers.length === 0) {
            return new NextResponse("Event acknowledged (No active triggers)", { status: 200 });
        }

        // 4. Parse payload
        let payload: any;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return new NextResponse("Invalid JSON payload", { status: 400 });
        }

        // Extract phone number from standard WooCommerce locations
        let phone = payload?.billing?.phone || payload?.shipping?.phone || payload?.phone;

        if (!phone) {
            return new NextResponse("Payload missing phone number", { status: 200 });
        }

        // Clean phone: strip all non-digits
        phone = String(phone).replace(/\D/g, "");

        // 5. Build and save AutomatedMessage records, then send immediately
        const apiUrl = whatsappConfig
            ? `https://graph.facebook.com/v19.0/${whatsappConfig.phoneNumberId}/messages`
            : null;

        for (const trigger of matchingTriggers) {
            // Build template variable map from WooCommerce payload
            const resolvedVars: Record<string, string> = {};

            if (trigger.variableMapping) {
                const mappingObj = trigger.variableMapping instanceof Map
                    ? Object.fromEntries(trigger.variableMapping)
                    : trigger.variableMapping.toObject?.() ?? trigger.variableMapping;

                for (const [varName, jsonPath] of Object.entries(mappingObj)) {
                    const val = getNestedValue(payload, jsonPath as string);
                    if (val !== undefined) resolvedVars[varName] = val;
                }
            }

            // Save to DB immediately as 'pending'
            const msgDoc = await AutomatedMessage.create({
                educatorId: integration.educatorId,
                integration: "woocommerce",
                triggerId: trigger._id,
                phone,
                templateName: trigger.templateName,
                templateLanguage: trigger.templateLanguage,
                templateVariables: resolvedVars,
                status: "pending",
                payloadTimestamp: new Date(),
            });

            // If we have a valid WhatsApp config, send immediately
            if (apiUrl && whatsappConfig) {
                try {
                    const components = buildComponents(resolvedVars);

                    const metaPayload: Record<string, unknown> = {
                        messaging_product: "whatsapp",
                        to: phone,
                        type: "template",
                        template: {
                            name: trigger.templateName,
                            language: { code: trigger.templateLanguage }
                        }
                    };

                    if (components.length > 0) {
                        (metaPayload.template as Record<string, unknown>).components = components;
                    }

                    const metaRes = await fetch(apiUrl, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${whatsappConfig.accessToken}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(metaPayload)
                    });

                    const metaData = await metaRes.json();

                    if (metaRes.ok && metaData.messages?.[0]?.id) {
                        msgDoc.status = "sent";
                        msgDoc.messageId = metaData.messages[0].id;
                        console.log(`[WooCommerce Webhook] ✅ Sent to ${phone} via ${trigger.templateName}`);
                    } else {
                        msgDoc.status = "failed";
                        msgDoc.errorMessage = metaData.error?.message || `Meta error ${metaRes.status}`;
                        console.error(`[WooCommerce Webhook] ❌ Failed to send to ${phone}:`, msgDoc.errorMessage);
                    }
                } catch (sendErr: any) {
                    msgDoc.status = "failed";
                    msgDoc.errorMessage = sendErr.message || "Network error";
                    console.error(`[WooCommerce Webhook] ❌ Error sending to ${phone}:`, sendErr.message);
                }

                await msgDoc.save();
            } else {
                console.warn(`[WooCommerce Webhook] No WhatsApp config found for educator ${educatorId}. Message saved as pending.`);
            }
        }

        // Return 200 immediately so WooCommerce confirms delivery
        return new NextResponse("Webhook processed successfully", { status: 200 });

    } catch (error: any) {
        console.error("[WooCommerce Webhook Error]:", error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
