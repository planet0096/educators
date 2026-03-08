// Cal.com Automation Flow Engine
// Executes automation flows triggered by Cal.com webhook events

import dbConnect from "@/lib/db";
import AutomationFlow from "@/models/AutomationFlow";
import WhatsAppConfig from "@/models/WhatsAppConfig";
import CalComLog from "@/models/CalComLog";

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
    eventTypeId?: string;
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
    const parameters = variables.map((v) => ({ type: "text", text: v == null ? "" : String(v) }));

    const payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
            name: templateName,
            language: { code: languageCode },
            components: parameters.length > 0 ? [{ type: "body", parameters }] : [],
        },
    };

    console.log("[CalComEngine] Sending WA Template Payload:", JSON.stringify(payload, null, 2));

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
        console.error("[CalComEngine] WhatsApp template API error:", JSON.stringify(data, null, 2));

        // Extract detailed parameter failure reason if available
        let detailedError = data?.error?.message || "WhatsApp template API error";
        if (data?.error?.error_data?.details) {
            detailedError += ` (Details: ${data.error.error_data.details})`;
        }
        throw new Error(detailedError);
    }
    return data;
}

// Main executor: runs a single flow's nodes sequentially
async function executeFlow(
    flow: any,
    waConfig: any,
    bookingVars: Record<string, string>,
    bookingPayload: CalComBookingPayload
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

    let finalStatus: "success" | "failed" = "success";
    let finalErrorMessage = "";
    let templateNameLogged = "";

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visitedIds.has(nodeId)) continue;
        visitedIds.add(nodeId);

        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        try {
            if (node.type === "sendMessageNode") {
                const rawMessage = (node.data?.message as string) || "";
                const message = interpolateVariables(rawMessage, bookingVars);
                if (message.trim()) {
                    await sendWhatsAppText(phoneNumberId, accessToken, recipientPhone, message);
                    console.log(`[CalComEngine] ✅ Sent text message to ${recipientPhone}`);
                }
            } else if (node.type === "calcomTemplateNode") {
                const templateName = (node.data?.templateName as string) || "";
                const languageCode = (node.data?.languageCode as string) || "en_US";
                const mappings: string[] = (node.data?.variableMappings as string[]) || [];

                if (templateName) {
                    templateNameLogged = templateName;
                    const resolvedVars = mappings.map((m) => interpolateVariables(m, bookingVars));
                    await sendWhatsAppTemplate(phoneNumberId, accessToken, recipientPhone, templateName, languageCode, resolvedVars);
                    console.log(`[CalComEngine] ✅ Sent template "${templateName}" to ${recipientPhone}`);
                }
            } else if (node.type === "delayNode") {
                const delayMinutes = parseInt(node.data?.delayMinutes as string) || 0;
                if (delayMinutes > 0) {
                    console.log(`[CalComEngine] ⏰ Delay node: ${delayMinutes} mins (QStash scheduling needed for full support)`);
                }
            }

            const nextNodes = edgeMap[nodeId] || [];
            queue.push(...nextNodes);

        } catch (nodeErr: any) {
            finalStatus = "failed";
            finalErrorMessage = nodeErr.message || "Execution error";
            console.error(`[CalComEngine] Error executing node ${nodeId}:`, nodeErr.message);
            break; // Stop flow on hard error
        }
    }

    // Save execution log
    try {
        await CalComLog.create({
            educatorId: flow.educatorId,
            ruleId: flow._id,
            ruleName: flow.name,
            triggerEvent: bookingPayload.triggerEvent,
            bookingUid: bookingPayload.bookingUid,
            inviteeName: bookingPayload.inviteeName,
            inviteePhone: recipientPhone,
            templateName: templateNameLogged || "Flow Nodes",
            status: finalStatus,
            errorMessage: finalErrorMessage,
        });
    } catch (logErr) {
        console.error("[CalComEngine] Failed to save log:", logErr);
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

    // Fetch all active Cal.com flows for this user and trigger type
    let flows = await AutomationFlow.find({
        educatorId: educatorUserId,
        source: "calcom",
        triggerType,
        isActive: true,
    });

    // Filter flows by eventTypeId if the flow has specifically defined calcomEventTypes
    if (bookingPayload.eventTypeId) {
        flows = flows.filter(flow => {
            if (!flow.calcomEventTypes || flow.calcomEventTypes.length === 0) return true; // No filter = applies to all
            return flow.calcomEventTypes.includes(bookingPayload.eventTypeId);
        });
    }

    if (flows.length === 0) {
        console.log(`[CalComEngine] No active matching flows for trigger: ${triggerType} / eventType: ${bookingPayload.eventTypeId}`);
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
        await executeFlow(flow, waConfig, bookingVars, bookingPayload);
    }
}
