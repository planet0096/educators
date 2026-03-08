import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CalComIntegration from "@/models/CalComIntegration";
import CalComWebhookLog from "@/models/CalComWebhookLog";
import { runCalComFlows, CalComBookingPayload } from "@/lib/calcomFlowEngine";
import CalComLog from "@/models/CalComLog";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { triggerEvent, payload } = body;

        await dbConnect();

        // 1. Immediately log the raw webhook for troubleshooting
        let rawLogId: string | null = null;
        try {
            const rawLog = await CalComWebhookLog.create({
                triggerEvent,
                payload,
                processed: false,
            });
            rawLogId = rawLog._id.toString();
        } catch (e) {
            console.error("[CalCom Webhook] Failed to save raw log", e);
        }

        // Normalize trigger event (Cal.com sends BOOKING_CREATED, some versions send booking.created)
        // Use regex /g flag to replace ALL underscores, not just the first one
        const rawTrigger = (triggerEvent || "").toLowerCase();
        const normalizedEvent = rawTrigger.replace(/_/g, "."); // BOOKING_CREATED → booking.created

        console.log(`[CalCom Webhook] Raw trigger: "${triggerEvent}" → Normalized: "${normalizedEvent}"`);

        if (!["booking.created", "booking.cancelled", "booking.rescheduled"].includes(normalizedEvent)) {
            console.log(`[CalCom Webhook] Ignoring unrecognized event: ${normalizedEvent}`);
            if (rawLogId) await CalComWebhookLog.findByIdAndUpdate(rawLogId, { errorReason: `Ignored event type: ${triggerEvent} (normalized: ${normalizedEvent})` });
            return NextResponse.json({ message: "Event type ignored" }, { status: 200 });
        }

        const calComUserId = payload.user?.id || payload.organizer?.id;
        const calComUsername = payload.organizer?.username || payload.user?.username || "";

        // Extract attendee info
        const invitee = payload.attendees?.[0] || {};
        const inviteeName = invitee.name || payload.organizer?.name || "Student";

        let rawPhone = payload.responses?.phone?.value || invitee.phoneNumber || payload.responses?.["phone-number"]?.value || "";
        if (!rawPhone) {
            // Also check custom identifiers like attendeePhoneNumber
            if (payload.responses?.attendeePhoneNumber?.value) rawPhone = payload.responses.attendeePhoneNumber.value;
            else if (typeof payload.responses?.attendeePhoneNumber === "string") rawPhone = payload.responses.attendeePhoneNumber;
        }

        const inviteePhone = rawPhone.replace(/[\+\-\s\(\)]/g, "");
        const inviteeEmail = invitee.email || payload.responses?.email?.value || "";

        // Meeting details
        const meetingDate = payload.startTime
            ? new Date(payload.startTime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
            : "See booking details";
        const meetingLink = payload.videoCallData?.url || payload.location || "";
        const organizerName = payload.organizer?.name || "Your Educator";
        const cleanEventName = payload.eventTitle || payload.eventType?.title || payload.title || "Meeting";
        const eventTypeName = cleanEventName.length > 30 ? cleanEventName.substring(0, 27) + "..." : cleanEventName;
        const eventTypeId = payload.eventType?.id ? String(payload.eventType.id) : "";
        const bookingUid = payload.uid || "";
        const inviteeTimeZone = invitee.timeZone || payload.organizer?.timeZone || "UTC";

        // Find the educator's integration by Cal.com userId or username
        let integration = await CalComIntegration.findOne({ calComUserId });
        if (!integration && calComUsername) {
            integration = await CalComIntegration.findOne({ calComUsername });
        }

        if (!integration) {
            console.log(`[CalCom Webhook] No integration found for userId:${calComUserId} username:${calComUsername}`);
            return NextResponse.json({ message: "No integration found for organizer" }, { status: 200 });
        }

        const educatorUserId = integration.user.toString();

        if (!inviteePhone) {
            console.log(`[CalCom Webhook] No phone in booking ${bookingUid}. Skipping message flows.`);
            if (rawLogId) await CalComWebhookLog.findByIdAndUpdate(rawLogId, { errorReason: "No phone number found in payload" });
            return NextResponse.json({ message: "No phone number — flows skipped" }, { status: 200 });
        }

        if (rawLogId) await CalComWebhookLog.findByIdAndUpdate(rawLogId, { processed: true });

        // If this is a Cancellation or Reschedule, proactively hunt down pending QStash jobs and kill them
        if (normalizedEvent === "booking.cancelled" || normalizedEvent === "booking.rescheduled") {
            try {
                const pendingLogs = await CalComLog.find({
                    educatorId: educatorUserId,
                    bookingUid,
                    status: "scheduled",
                    qstashMessageId: { $exists: true, $ne: null }
                });

                if (pendingLogs.length > 0 && process.env.QSTASH_TOKEN) {
                    const { Client } = await import("@upstash/qstash");
                    const qstash = new Client({ token: process.env.QSTASH_TOKEN });

                    for (const log of pendingLogs) {
                        try {
                            await qstash.messages.delete(log.qstashMessageId!);
                            console.log(`[CalCom Webhook] Successfully revoked QStash job ${log.qstashMessageId} for cancelled/rescheduled booking ${bookingUid}`);
                        } catch (revokeErr) {
                            console.error(`[CalCom Webhook] Failed to revoke QStash job ${log.qstashMessageId}`, revokeErr);
                        }
                    }

                    await CalComLog.updateMany(
                        { _id: { $in: pendingLogs.map(l => l._id) } },
                        { $set: { status: "cancelled", errorMessage: `Job revoked proactively because the booking was ${normalizedEvent.split('.')[1]}` } }
                    );
                }
            } catch (err) {
                console.error("[CalCom Webhook] Error cleaning up QStash tasks:", err);
            }
        }

        const bookingPayload: CalComBookingPayload = {
            triggerEvent: normalizedEvent,
            inviteeName,
            inviteePhone,
            inviteeEmail,
            meetingDate,
            meetingDateRaw: payload.startTime || "",
            meetingLink,
            organizerName,
            calComUserId,
            calComUsername,
            eventTypeName,
            eventTypeId,
            bookingUid,
            inviteeTimeZone,
        };

        // Run all matching Cal.com automation flows
        await runCalComFlows(educatorUserId, normalizedEvent, bookingPayload);

        return NextResponse.json({ success: true, message: "Cal.com flows executed" }, { status: 200 });

    } catch (error: any) {
        console.error("[CalCom Webhook] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
