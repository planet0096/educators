import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import AutomatedMessage from "@/models/AutomatedMessage";
import WhatsAppConfig from "@/models/WhatsAppConfig";

const BATCH_SIZE = 10;

// Build WhatsApp template components from stored variable map
// Each key looks like BODY_1, HEADER_1, etc.
function buildComponents(templateVariables: Map<string, string>): any[] {
    const components: any[] = [];
    const bodyParams: any[] = [];
    const headerParams: any[] = [];

    const vars = templateVariables instanceof Map
        ? Object.fromEntries(templateVariables)
        : (templateVariables as Record<string, string>);

    for (const [key, value] of Object.entries(vars)) {
        if (key.startsWith("BODY_")) {
            const index = parseInt(key.replace("BODY_", ""), 10);
            bodyParams[index - 1] = { type: "text", text: value || "" };
        } else if (key.startsWith("HEADER_")) {
            const index = parseInt(key.replace("HEADER_", ""), 10);
            if (!isNaN(index)) {
                headerParams[index - 1] = { type: "text", text: value || "" };
            }
        }
    }

    if (headerParams.filter(Boolean).length > 0) {
        components.push({ type: "header", parameters: headerParams.filter(Boolean) });
    }
    if (bodyParams.filter(Boolean).length > 0) {
        components.push({ type: "body", parameters: bodyParams.filter(Boolean) });
    }

    return components;
}

// POST /api/whatsapp/automations/process
// Called by the webhook receiver or a polling UI to drain the AutomatedMessage queue
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // 1. Fetch WhatsApp config for this educator
        const config = await WhatsAppConfig.findOne({ user: session.user.id });
        if (!config?.phoneNumberId || !config?.accessToken) {
            return NextResponse.json({ error: "WhatsApp configuration is missing. Please check Settings." }, { status: 400 });
        }

        // 2. Fetch a batch of pending automated messages for this educator
        const pendingMessages = await AutomatedMessage.find({
            educatorId: session.user.id,
            status: "pending"
        }).limit(BATCH_SIZE);

        if (pendingMessages.length === 0) {
            return NextResponse.json({ success: true, processed: 0, message: "No pending messages" });
        }

        const apiUrl = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;
        let successCount = 0;
        let failedCount = 0;

        // 3. Process each message concurrently
        const sendPromises = pendingMessages.map(async (msg) => {
            try {
                const components = buildComponents(msg.templateVariables);

                const payload: Record<string, unknown> = {
                    messaging_product: "whatsapp",
                    to: msg.phone,
                    type: "template",
                    template: {
                        name: msg.templateName,
                        language: { code: msg.templateLanguage }
                    }
                };

                if (components.length > 0) {
                    (payload.template as Record<string, unknown>).components = components;
                }

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${config.accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok && data.messages?.[0]?.id) {
                    msg.status = "sent";
                    msg.messageId = data.messages[0].id;
                    successCount++;
                } else {
                    msg.status = "failed";
                    msg.errorMessage = data.error?.message || `Meta API Error: ${response.status}`;
                    failedCount++;
                }
            } catch (err: any) {
                msg.status = "failed";
                msg.errorMessage = err.message || "Network error";
                failedCount++;
            }
            await msg.save();
        });

        await Promise.allSettled(sendPromises);

        return NextResponse.json({
            success: true,
            processed: pendingMessages.length,
            sent: successCount,
            failed: failedCount
        });

    } catch (error: any) {
        console.error("[Automation Queue Processor Error]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
