import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs";
import { executeFlow, CalComBookingPayload } from "@/lib/calcomFlowEngine";
import WhatsAppConfig from "@/models/WhatsAppConfig";
import CalComLog from "@/models/CalComLog";
import AutomationFlow from "@/models/AutomationFlow";
import dbConnect from "@/lib/db";

async function handler(req: Request) {
    try {
        const body = await req.json();
        const { flowId, educatorId, bookingVars, bookingPayload, resumeNodeId } = body;

        console.log(`[Cal.com QStash Consumer] Waking up flow ${flowId} at node ${resumeNodeId} for ${bookingPayload?.inviteeName}`);

        if (!flowId || !educatorId || !resumeNodeId) {
            console.error("[Cal.com QStash Consumer] Missing required fields", body);
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();

        // Check if the source booking was cancelled before we try to resume
        // If the user cancelled, we shouldn't send the delayed reminder
        const recentLogs = await CalComLog.find({ bookingUid: bookingPayload?.bookingUid }).sort({ executedAt: -1 });
        const hasCancellation = recentLogs.some(log =>
            log.triggerEvent === "booking.cancelled" || log.triggerEvent === "booking.rescheduled"
        );

        if (hasCancellation) {
            console.log(`[Cal.com QStash Consumer] ❌ Booking ${bookingPayload?.bookingUid} was cancelled or rescheduled. Dropping scheduled job for flow ${flowId}`);

            // Mark the old scheduled log as cancelled
            await CalComLog.updateMany(
                { ruleId: flowId, bookingUid: bookingPayload?.bookingUid, status: "scheduled" },
                { $set: { status: "cancelled", errorMessage: "Job cancelled because the meeting was cancelled or rescheduled." } }
            );

            return NextResponse.json({ success: true, message: "Job cleanly dropped due to meeting cancellation/reschedule." });
        }

        const flow = await AutomationFlow.findById(flowId);
        if (!flow) {
            console.error(`[Cal.com QStash Consumer] Flow ${flowId} no longer exists.`);
            return NextResponse.json({ error: "Flow not found." }, { status: 400 });
        }

        // Must still be active
        if (!flow.isActive) {
            console.log(`[Cal.com QStash Consumer] Flow ${flowId} was deactivated. Dropping job.`);
            return NextResponse.json({ success: true, message: "Flow deactivated, job dropped." });
        }

        const waConfig = await WhatsAppConfig.findOne({ user: educatorId });
        if (!waConfig) {
            console.error(`[Cal.com QStash Consumer] WhatsApp config missing for educator ${educatorId}`);
            return NextResponse.json({ error: "No WA Config found." }, { status: 400 });
        }

        // Successfully woke up! Update the database to reflect that the scheduled waiting period ended
        await CalComLog.updateMany(
            { ruleId: flowId, bookingUid: bookingPayload?.bookingUid, status: "scheduled" },
            { $set: { status: "success", errorMessage: "Woke up from QStash sequence." } }
        );

        // Resume the flow exactly where it left off
        await executeFlow(flow, waConfig, bookingVars, bookingPayload, resumeNodeId);

        return NextResponse.json({ success: true, message: "Scheduled job executed successfully." }, { status: 200 });

    } catch (error: any) {
        console.error("[Cal.com QStash Consumer Error]:", error);
        // Throw 500 to trigger QStash Exponential Backoff Retry mechanism
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Only Upstash QStash can call this endpoint
export const POST = verifySignatureAppRouter(handler);
