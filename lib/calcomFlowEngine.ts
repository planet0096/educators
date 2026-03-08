// Cal.com Automation Flow Engine
// Executes automation flows triggered by Cal.com webhook events

import dbConnect from "@/lib/db";
import AutomationFlow from "@/models/AutomationFlow";
import WhatsAppConfig from "@/models/WhatsAppConfig";
import CalComLog from "@/models/CalComLog";
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN || "" });

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
    inviteeTimeZone?: string;
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
export async function executeFlow(
    flow: any,
    waConfig: any,
    bookingVars: Record<string, string>,
    bookingPayload: CalComBookingPayload,
    startNodeId?: string // Used when resuming from a Delay QStash job
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
    if (!triggerNode && !startNodeId) {
        console.warn(`[CalComEngine] Flow ${flow._id} has no trigger node.`);
        return;
    }

    const { phoneNumberId, accessToken } = waConfig;
    const recipientPhone = bookingVars.invitee_phone;

    if (!recipientPhone) {
        console.warn(`[CalComEngine] No phone number for flow ${flow._id}. Skipping.`);
        return;
    }

    // Traverse nodes starting from trigger (or resumed node)
    let visitedIds = new Set<string>();
    let queue = startNodeId ? [startNodeId] : (edgeMap[triggerNode.id] || []);

    let finalStatus: "success" | "failed" | "scheduled" = "success";
    let finalErrorMessage = "";
    let templateNameLogged = "";
    let scheduledFor: Date | undefined;
    let qstashMessageId: string | undefined;

    let stoppedAtNodeId: string | undefined;

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
                const delayMinutesAmount = parseInt(node.data?.delayMinutes as string) || 60;
                const delayUnit = (node.data?.delayUnit as string) || "minutes";

                let totalDelayMs = delayMinutesAmount * 60 * 1000;
                if (delayUnit === "hours") totalDelayMs *= 60;
                if (delayUnit === "days") totalDelayMs *= 24 * 60;

                const resumeTime = new Date(Date.now() + totalDelayMs);

                const nextNodes = edgeMap[nodeId] || [];
                if (nextNodes.length === 0) {
                    console.log(`[CalComEngine] Delay node hit at end of flow. Nothing to schedule.`);
                    continue; // End execution cleanly
                }

                // Prepare to pause. We only schedule the FIRST branch right now for simplicity.
                stoppedAtNodeId = nextNodes[0];

                if (process.env.QSTASH_TOKEN) {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
                    const published = await qstash.publishJSON({
                        url: `${baseUrl}/api/calcom/queue`,
                        body: {
                            flowId: flow._id,
                            educatorId: flow.educatorId,
                            bookingVars,
                            bookingPayload,
                            resumeNodeId: stoppedAtNodeId
                        },
                        notBefore: Math.floor(resumeTime.getTime() / 1000)
                    });

                    qstashMessageId = published.messageId;
                    finalStatus = "scheduled";
                    scheduledFor = resumeTime;
                    console.log(`[CalComEngine] ⏰ Scheduled continuation at ${resumeTime.toISOString()} via node ${stoppedAtNodeId}`);

                    // Break the loop completely so we DONT process the next nodes now
                    break;
                } else {
                    console.warn(`[CalComEngine] Delay node requires QSTASH_TOKEN. Skipping delay and executing immediately.`);
                }
            }

            // Only enqueue next children if we didn't just break for a Delay
            // (the break above handles 'scheduled' termination)
            const nextNodes = edgeMap[nodeId] || [];
            queue.push(...nextNodes);

        } catch (nodeErr: any) {
            finalStatus = "failed";
            finalErrorMessage = nodeErr.message || "Execution error";
            console.error(`[CalComEngine] Error executing node ${nodeId}:`, nodeErr.message);
            break; // Stop flow on hard error
        }
    }

    // Save or Update execution log
    try {
        await CalComLog.create({
            educatorId: flow.educatorId,
            ruleId: flow._id,
            ruleName: flow.name,
            triggerEvent: bookingPayload.triggerEvent,
            bookingUid: bookingPayload.bookingUid,
            inviteeName: bookingPayload.inviteeName,
            inviteePhone: recipientPhone,
            inviteeTimeZone: bookingPayload.inviteeTimeZone,
            templateName: templateNameLogged || "Flow Nodes",
            status: finalStatus,
            errorMessage: finalErrorMessage,
            scheduledFor,
            qstashMessageId,
            flowState: stoppedAtNodeId ? { resumeNodeId: stoppedAtNodeId } : undefined
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

    // Also pick up "calcom_reminder" flows IF the event is "booking.created"
    // (We schedule the reminder precisely when the creation webhook fires)
    if (triggerEvent === "booking.created") {
        const reminderFlows = await AutomationFlow.find({
            educatorId: educatorUserId,
            source: "calcom",
            triggerType: "calcom_reminder",
            isActive: true,
        });
        flows = [...flows, ...reminderFlows];
    }

    if (bookingPayload.eventTypeId) {
        flows = flows.filter(flow => {
            if (!flow.calcomEventTypes || flow.calcomEventTypes.length === 0) return true;
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

    // Apply Timezone Formatting specifically for the meeting Date so the invitee sees their local time
    let formattedMeetingDate = bookingPayload.meetingDate;
    if (bookingPayload.meetingDateRaw && bookingPayload.inviteeTimeZone) {
        try {
            formattedMeetingDate = new Date(bookingPayload.meetingDateRaw).toLocaleString("en-US", {
                timeZone: bookingPayload.inviteeTimeZone,
                weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
            });
        } catch (e) { /* fallback */ }
    }

    const bookingVars: Record<string, string> = {
        invitee_name: bookingPayload.inviteeName,
        invitee_phone: bookingPayload.inviteePhone,
        invitee_email: bookingPayload.inviteeEmail || "",
        meeting_date: formattedMeetingDate,
        meeting_link: bookingPayload.meetingLink,
        organizer_name: bookingPayload.organizerName,
        event_type: bookingPayload.eventTypeName || "Meeting",
        booking_uid: bookingPayload.bookingUid,
    };

    for (const flow of flows) {
        // If this is a REMINDER flow being attached to a Booking Creation:
        if (flow.triggerType === "calcom_reminder" && triggerEvent === "booking.created") {
            const triggerNode = flow.flowData?.nodes?.find((n: any) => n.type === "calcomTriggerNode");
            if (!triggerNode) continue;

            // e.g., "1" "days" "before"
            const reminderAmount = parseInt(triggerNode.data.reminderAmount as string) || 24;
            const reminderUnit = (triggerNode.data.reminderUnit as string) || "hours";
            const reminderDirection = (triggerNode.data.reminderDirection as string) || "before";

            let offsetMs = reminderAmount * 60 * 1000; // start with minutes
            if (reminderUnit === "hours") offsetMs *= 60;
            if (reminderUnit === "days") offsetMs *= 24 * 60;

            const meetingTime = new Date(bookingPayload.meetingDateRaw).getTime();
            const executeAtTime = reminderDirection === "before"
                ? meetingTime - offsetMs
                : meetingTime + offsetMs;

            const executeAtDate = new Date(executeAtTime);

            // Do not schedule if it's already in the past
            if (executeAtDate.getTime() < Date.now()) {
                console.log(`[CalComEngine] Skipping reminder, requested time was in the past.`);
                continue;
            }

            if (process.env.QSTASH_TOKEN) {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
                try {
                    const published = await qstash.publishJSON({
                        url: `${baseUrl}/api/calcom/queue`,
                        body: {
                            flowId: flow._id,
                            educatorId: flow.educatorId,
                            bookingVars,
                            bookingPayload,
                            // Start at the trigger node's immediate children when we resume
                            resumeNodeId: flow.flowData?.edges?.find((e: any) => e.source === triggerNode.id)?.target
                        },
                        notBefore: Math.floor(executeAtDate.getTime() / 1000)
                    });

                    // Log the reminder schedule
                    await CalComLog.create({
                        educatorId: flow.educatorId,
                        ruleId: flow._id,
                        ruleName: flow.name,
                        triggerEvent: "booking.reminder.scheduled",
                        bookingUid: bookingPayload.bookingUid,
                        inviteeName: bookingPayload.inviteeName,
                        inviteePhone: bookingPayload.inviteePhone,
                        inviteeTimeZone: bookingPayload.inviteeTimeZone,
                        templateName: "Scheduled Reminder",
                        status: "scheduled",
                        scheduledFor: executeAtDate,
                        qstashMessageId: published.messageId,
                        flowState: { isReminder: true }
                    });
                    console.log(`[CalComEngine] ✅ Scheduled Reminder "${flow.name}" via QStash for ${executeAtDate.toISOString()}`);
                } catch (e) {
                    console.error(`[CalComEngine] QStash Delivery Error`, e);
                }
            } else {
                console.warn(`[CalComEngine] QSTASH_TOKEN missing, cannot schedule Cal.com reminders.`);
            }
            continue; // Skip immediate execution
        }

        console.log(`[CalComEngine] 🚀 Running flow: "${flow.name}" for ${bookingPayload.inviteeName}`);
        await executeFlow(flow, waConfig, bookingVars, bookingPayload);
    }
}

