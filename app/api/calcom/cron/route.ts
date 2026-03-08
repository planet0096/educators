import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CalComLog from "@/models/CalComLog";
import AutomationFlow from "@/models/AutomationFlow";
import { Client } from "@upstash/qstash";

const QSTASH_MAX_DELAY_SECONDS = 604800; // 7 days (QStash free tier limit)

function getAppUrl(): string {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
}

/**
 * GET /api/calcom/cron
 * 
 * Runs on a daily Vercel cron schedule.
 * Finds CalComLog entries that are:
 *   - status = "scheduled"
 *   - have no qstashMessageId yet (pending cron pickup)
 *   - scheduledFor is in the future and within the next 7 days
 * 
 * Publishes them to QStash so they fire at the correct time.
 * 
 * This allows booking reminders far in the future (>7 days away)
 * to be created without hitting QStash's maxDelay quota limit.
 */
export async function GET(req: Request) {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn("[CalCom Cron] Unauthorized request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const qstashToken = process.env.QSTASH_TOKEN;
    if (!qstashToken) {
        console.error("[CalCom Cron] QSTASH_TOKEN not set");
        return NextResponse.json({ error: "QSTASH_TOKEN not configured" }, { status: 500 });
    }

    const qstash = new Client({ token: qstashToken });
    const callbackUrl = `${getAppUrl()}/api/calcom/queue`;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + QSTASH_MAX_DELAY_SECONDS * 1000);

    // Find all scheduled logs that are within the next 7 days and not yet published to QStash
    const pendingLogs = await CalComLog.find({
        status: "scheduled",
        qstashMessageId: { $exists: false },
        scheduledFor: {
            $gte: now,
            $lte: sevenDaysFromNow,
        },
    }).limit(100);

    console.log(`[CalCom Cron] Found ${pendingLogs.length} pending reminder(s) to schedule`);

    let scheduled = 0;
    let failed = 0;

    for (const log of pendingLogs) {
        const flowState = log.flowState;
        if (!flowState?.pendingQstashPublish || !flowState?.resumeNodeId) {
            console.warn(`[CalCom Cron] Log ${log._id} is missing flowState data, skipping`);
            continue;
        }

        // Verify the flow still exists and is active
        const flow = await AutomationFlow.findById(log.ruleId);
        if (!flow || !flow.isActive) {
            console.log(`[CalCom Cron] Flow ${log.ruleId} no longer exists or is inactive. Cancelling log.`);
            await CalComLog.findByIdAndUpdate(log._id, {
                status: "cancelled",
                errorMessage: "Flow was deleted or deactivated before reminder could fire."
            });
            continue;
        }

        try {
            const published = await qstash.publishJSON({
                url: callbackUrl,
                body: {
                    flowId: log.ruleId,
                    educatorId: log.educatorId,
                    bookingVars: flowState.bookingVars,
                    bookingPayload: flowState.bookingPayload,
                    resumeNodeId: flowState.resumeNodeId,
                },
                notBefore: Math.floor(new Date(log.scheduledFor!).getTime() / 1000),
            });

            await CalComLog.findByIdAndUpdate(log._id, {
                qstashMessageId: published.messageId,
                "flowState.pendingQstashPublish": false,
            });

            console.log(`[CalCom Cron] ✅ Published reminder for "${log.ruleName}" → ${log.scheduledFor} (msgId: ${published.messageId})`);
            scheduled++;
        } catch (err: any) {
            console.error(`[CalCom Cron] Failed to publish log ${log._id}:`, err.message);
            await CalComLog.findByIdAndUpdate(log._id, {
                status: "failed",
                errorMessage: `Cron publish error: ${err.message}`
            });
            failed++;
        }
    }

    return NextResponse.json({
        success: true,
        processed: pendingLogs.length,
        scheduled,
        failed,
        checkedAt: now.toISOString(),
    });
}
