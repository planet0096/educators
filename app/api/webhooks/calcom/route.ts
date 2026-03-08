import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CalComIntegration from "@/models/CalComIntegration";
import CalComRule from "@/models/CalComRule";
import CalComLog from "@/models/CalComLog";
import WhatsAppConfig from "@/models/WhatsAppConfig";

const TRIGGER_MAP: Record<string, string> = {
    "booking.created": "calcom_booking_created",
    "booking.cancelled": "calcom_booking_cancelled",
    "booking.rescheduled": "calcom_booking_rescheduled",
};

const CALCOM_VARS: Record<string, string> = {
    "{{invitee_name}}": "",
    "{{invitee_phone}}": "",
    "{{invitee_email}}": "",
    "{{meeting_date}}": "",
    "{{meeting_link}}": "",
    "{{organizer_name}}": "",
    "{{event_type}}": "",
    "{{booking_uid}}": "",
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { triggerEvent, payload } = body;

        const triggerType = TRIGGER_MAP[triggerEvent];
        if (!triggerType) {
            return NextResponse.json({ message: "Event ignored" }, { status: 200 });
        }

        // Extract booking details
        const calComUserId = payload.user?.id || payload.organizer?.id;
        const calComUsername = payload.organizer?.username || payload.user?.username || "";
        const invitee = payload.attendees?.[0] || {};
        const inviteeName = invitee.name || "Student";
        const rawPhone = payload.responses?.phone?.value || invitee.phoneNumber || payload.responses?.["phone-number"]?.value || "";
        const inviteePhone = rawPhone.replace(/[\+\-\s\(\)]/g, "");
        const inviteeEmail = invitee.email || payload.responses?.email?.value || "";
        const meetingDate = payload.startTime
            ? new Date(payload.startTime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
            : "See your calendar";
        const meetingLink = payload.videoCallData?.url || payload.location || "See your calendar";
        const organizerName = payload.organizer?.name || "Your Tutor";
        const eventType = payload.eventType?.title || payload.title || "Meeting";
        const bookingUid = payload.uid || "";

        if (!inviteePhone) {
            console.log(`[CalCom Webhook] No phone in booking ${bookingUid}`);
            return NextResponse.json({ message: "No phone number — skipped" }, { status: 200 });
        }

        await dbConnect();

        // Find educator integration
        let integration = await CalComIntegration.findOne({ calComUserId });
        if (!integration && calComUsername) {
            integration = await CalComIntegration.findOne({ calComUsername });
        }
        if (!integration) {
            console.log(`[CalCom Webhook] No integration for user ${calComUserId} / ${calComUsername}`);
            return NextResponse.json({ message: "No integration found" }, { status: 200 });
        }

        const educatorId = integration.user;

        // Find WA config
        const waConfig = await WhatsAppConfig.findOne({ user: educatorId });
        if (!waConfig) {
            console.log(`[CalCom Webhook] No WA config for educator ${educatorId}`);
            return NextResponse.json({ message: "No WhatsApp config" }, { status: 200 });
        }

        // Find active rules for this trigger
        const rules = await CalComRule.find({ educatorId, triggerType, isActive: true });
        if (rules.length === 0) {
            console.log(`[CalCom Webhook] No active rules for trigger ${triggerType}`);
            return NextResponse.json({ message: "No active rules" }, { status: 200 });
        }

        // Variable map for substitution
        const vars: Record<string, string> = {
            "{{invitee_name}}": inviteeName,
            "{{invitee_phone}}": inviteePhone,
            "{{invitee_email}}": inviteeEmail,
            "{{meeting_date}}": meetingDate,
            "{{meeting_link}}": meetingLink,
            "{{organizer_name}}": organizerName,
            "{{event_type}}": eventType,
            "{{booking_uid}}": bookingUid,
        };

        const { phoneNumberId, accessToken } = waConfig;
        const results: any[] = [];

        // Execute each rule
        for (const rule of rules) {
            let status: "success" | "failed" = "success";
            let errorMessage = "";

            try {
                // Build parameters from the rule's variable mappings
                const parameters = rule.variableMappings.map((m: { param: string; variable: string }) => ({
                    type: "text",
                    text: vars[m.variable] || m.variable,
                }));

                const messagePayload: any = {
                    messaging_product: "whatsapp",
                    to: inviteePhone,
                    type: "template",
                    template: {
                        name: rule.templateName,
                        language: { code: rule.languageCode || "en_US" },
                    },
                };

                if (parameters.length > 0) {
                    messagePayload.template.components = [{
                        type: "body",
                        parameters,
                    }];
                }

                const waRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(messagePayload),
                });

                const waData = await waRes.json();

                if (!waRes.ok) {
                    throw new Error(waData?.error?.message || `WhatsApp API error ${waRes.status}`);
                }

                console.log(`[CalCom Webhook] ✅ Rule "${rule.name}" sent template "${rule.templateName}" to ${inviteePhone}`);
                results.push({ rule: rule.name, status: "success" });

            } catch (err: any) {
                status = "failed";
                errorMessage = err.message || "Unknown error";
                console.error(`[CalCom Webhook] ❌ Rule "${rule.name}" failed:`, errorMessage);
                results.push({ rule: rule.name, status: "failed", error: errorMessage });
            }

            // Save execution log
            await CalComLog.create({
                educatorId,
                ruleId: rule._id,
                ruleName: rule.name,
                triggerEvent,
                bookingUid,
                inviteeName,
                inviteePhone,
                templateName: rule.templateName,
                status,
                errorMessage,
                executedAt: new Date(),
            });
        }

        return NextResponse.json({ success: true, results }, { status: 200 });

    } catch (error: any) {
        console.error("[CalCom Webhook] Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
