// Cal.com Automation Flow Engine
// Executes automation flows triggered by Cal.com webhook events

import dbConnect from "@/lib/db";
import AutomationFlow from "@/models/AutomationFlow";
import WhatsAppConfig from "@/models/WhatsAppConfig";

export interface CalComBookingPayload {
    triggerEvent: string;
    inviteeName: string;
    inviteePhone: string;
    inviteeEmail?: string;
    meetingDate: string;
    meetingDateRaw: string;
    meetingLink: string;
    organizerName: string;
    calComUserId: number;
    calComUsername: string;
    eventTypeName?: string;
    bookingUid: string;
}

// Replace {{variable}} placeholders in a message string with actual values
function interpolateVariables(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

// Send a plain WhatsApp text message
async function sendWhatsAppText(phoneNumberId: string, accessToken: string, to: string, text: string) {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: text },
        }),
    });
    const data = await res.json();
    if (!res.ok) {
        console.error("[CalComEngine] WhatsApp API error:", data);
        throw new Error(data?.error?.message || "WhatsApp API error");
    }
    return data;
}

// Send a WhatsApp template message
async function sendWhatsAppTemplate(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    templateName: string,
    languageCode: string,
    variables: string[]
) {
    const parameters = variables.map((v) => ({ type: "text", text: v }));
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
                name: templateName,
                language: { code: languageCode },
                components: parameters.length > 0 ? [{ type: "body", parameters }] : [],
            },
        }),
    });
    const data = await res.json();
    if (!res.ok) {
        console.error("[CalComEngine] WhatsApp template API error:", data);
        throw new Error(data?.error?.message || "WhatsApp template API error");
    }
    return data;
}

// Main executor: runs a single flow's nodes sequentially
async function executeFlow(
    flow: any,
    waConfig: any,
    bookingVars: Record<string, string>
) {
    const nodes: any[] = flow.flowData?.nodes || [];
    const edges: any[] = flow.flowData?.edges || [];

    // Build adjacency map: nodeId → next nodeId(s)
    const edgeMap: Record<string, string[]> = {};
    for (const edge of edges) {
        if (!edgeMap[edge.source]) edgeMap[edge.source] = [];
        edgeMap[edge.source].push(edge.target);
    }

    // Find the trigger node to start from
    const triggerNode = nodes.find((n) => n.type === "calcomTriggerNode" || n.type === "triggerNode");
    if (!triggerNode) {
        console.warn(`[CalComEngine] Flow ${flow._id} has no trigger node.`);
        return;
    }

    const { phoneNumberId, accessToken } = waConfig;
    const recipientPhone = bookingVars.invitee_phone;

    if (!recipientPhone) {
        console.warn(`[CalComEngine] No phone number for flow ${flow._id}. Skipping.`);
        return;
    }

    // Traverse nodes starting from trigger
    let visitedIds = new Set<string>();
    let queue = edgeMap[triggerNode.id] || [];

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visitedIds.has(nodeId)) continue;
        visitedIds.add(nodeId);

        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        try {
            if (node.type === "sendMessageNode") {
                // Plain text or interactive message (instant send)
                const rawMessage = (node.data?.message as string) || "";
                const message = interpolateVariables(rawMessage, bookingVars);

                if (message.trim()) {
                    await sendWhatsAppText(phoneNumberId, accessToken, recipientPhone, message);
                    console.log(`[CalComEngine] ✅ Sent text message to ${recipientPhone}`);
                }

            } else if (node.type === "calcomTemplateNode") {
                // Send WhatsApp approved template with dynamic variables
                const templateName = (node.data?.templateName as string) || "";
                const languageCode = (node.data?.languageCode as string) || "en_US";
                const mappings: string[] = (node.data?.variableMappings as string[]) || [];

                if (templateName) {
                    const resolvedVars = mappings.map((m) => interpolateVariables(m, bookingVars));
                    await sendWhatsAppTemplate(phoneNumberId, accessToken, recipientPhone, templateName, languageCode, resolvedVars);
                    console.log(`[CalComEngine] ✅ Sent template "${templateName}" to ${recipientPhone}`);
                }

            } else if (node.type === "delayNode") {
                // Schedule via QStash for delayed execution
                // For now we just log — QStash integration can be added as a next step
                const delayMinutes = parseInt(node.data?.delayMinutes as string) || 0;
                if (delayMinutes > 0) {
                    console.log(`[CalComEngine] ⏰ Delay node: ${delayMinutes} mins (QStash scheduling needed for full support)`);
                    // TODO: Use QStash to fire remaining nodes after delay
                }
            }

            // Queue next nodes
            const nextNodes = edgeMap[nodeId] || [];
            queue.push(...nextNodes);

        } catch (nodeErr: any) {
            console.error(`[CalComEngine] Error executing node ${nodeId}:`, nodeErr.message);
        }
    }
}

// Main entry: find all active flows for this educator matching the trigger, then execute them
export async function runCalComFlows(
    educatorUserId: string,
    triggerEvent: string, // e.g. "booking.created"
    bookingPayload: CalComBookingPayload
) {
    await dbConnect();

    // Map Cal.com webhook trigger event to our flow triggerType
    const triggerTypeMap: Record<string, string> = {
        "booking.created": "calcom_booking_created",
        "booking.cancelled": "calcom_booking_cancelled",
        "booking.rescheduled": "calcom_booking_rescheduled",
    };

    const triggerType = triggerTypeMap[triggerEvent];
    if (!triggerType) {
        console.log(`[CalComEngine] No flow mapping for event: ${triggerEvent}`);
        return;
    }

    const flows = await AutomationFlow.find({
        educatorId: educatorUserId,
        source: "calcom",
        triggerType,
        isActive: true,
    });

    if (flows.length === 0) {
        console.log(`[CalComEngine] No active flows for trigger: ${triggerType}`);
        return;
    }

    const waConfig = await WhatsAppConfig.findOne({ user: educatorUserId });
    if (!waConfig) {
        console.warn(`[CalComEngine] No WhatsApp config for educator: ${educatorUserId}`);
        return;
    }

    // Build the variable map for interpolation
    const bookingVars: Record<string, string> = {
        invitee_name: bookingPayload.inviteeName,
        invitee_phone: bookingPayload.inviteePhone,
        invitee_email: bookingPayload.inviteeEmail || "",
        meeting_date: bookingPayload.meetingDate,
        meeting_link: bookingPayload.meetingLink,
        organizer_name: bookingPayload.organizerName,
        event_type: bookingPayload.eventTypeName || "Meeting",
        booking_uid: bookingPayload.bookingUid,
    };

    for (const flow of flows) {
        console.log(`[CalComEngine] 🚀 Running flow: "${flow.name}" for ${bookingPayload.inviteeName}`);
        await executeFlow(flow, waConfig, bookingVars);
    }
}
