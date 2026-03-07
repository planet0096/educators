import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs";
import dbConnect from "@/lib/db";
import CampaignMessage from "@/models/CampaignMessage";
import Campaign from "@/models/Campaign";
import WhatsAppConfig from "@/models/WhatsAppConfig";

// POST /api/whatsapp/campaigns/queue
// This route is called exclusively by Upstash QStash.
// It processes a single campaign message (one contact) per invocation.
// This gives us per-contact isolation, retries, and zero dependency on the browser.
async function handler(req: NextRequest) {
    let msg: any = null;

    try {
        const body = await req.json();
        const { campaignMessageId } = body;

        if (!campaignMessageId) {
            return new NextResponse("Missing campaignMessageId", { status: 400 });
        }

        await dbConnect();

        // 1. Fetch the pending message record
        msg = await CampaignMessage.findById(campaignMessageId);
        if (!msg) {
            console.warn(`[Campaign Queue] Message ${campaignMessageId} not found. Likely already processed.`);
            return new NextResponse("Message not found", { status: 400 });
        }

        // Idempotency guard: skip if already sent (prevents duplicate sends on retries)
        if (msg.status === "sent") {
            console.log(`[Campaign Queue] Message ${campaignMessageId} already sent. Skipping.`);
            return NextResponse.json({ skipped: true }, { status: 200 });
        }

        // 2. Fetch the parent Campaign + WhatsApp config
        const [campaign, config] = await Promise.all([
            Campaign.findById(msg.campaignId),
            WhatsAppConfig.findOne({ user: msg.campaignId }) // fallback below
        ]);

        if (!campaign) {
            return new NextResponse("Campaign not found", { status: 400 });
        }

        const whatsappConfig = await WhatsAppConfig.findOne({
            user: campaign.educatorId
        });

        if (!whatsappConfig?.phoneNumberId || !whatsappConfig?.accessToken) {
            msg.status = "failed";
            msg.errorMessage = "WhatsApp config missing for educator";
            await msg.save();
            return new NextResponse("WhatsApp config missing", { status: 400 });
        }

        // 3. Build the WhatsApp API payload
        const apiUrl = `https://graph.facebook.com/v19.0/${whatsappConfig.phoneNumberId}/messages`;
        const payload: any = {
            messaging_product: "whatsapp",
            to: msg.phone,
            type: "template",
            template: {
                name: campaign.templateName,
                language: { code: campaign.templateLanguage }
            }
        };

        if (msg.components && msg.components.length > 0) {
            payload.template.components = msg.components;
        }

        // 4. Send the message to Meta
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${whatsappConfig.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.messages?.[0]?.id) {
            // ✅ Success
            msg.status = "sent";
            msg.messageId = data.messages[0].id;
            await msg.save();

            // Update campaign success counter atomically
            await Campaign.findByIdAndUpdate(
                campaign._id,
                { $inc: { successfulSends: 1 } }
            );

            // Check if this was the last message → mark campaign completed
            const remaining = await CampaignMessage.countDocuments({
                campaignId: campaign._id,
                status: "pending"
            });
            if (remaining === 0) {
                await Campaign.findByIdAndUpdate(campaign._id, { status: "completed" });
                console.log(`[Campaign Queue] ✅ Campaign ${campaign._id} completed!`);
            }

            return NextResponse.json({ success: true, messageId: data.messages[0].id }, { status: 200 });
        } else {
            // ❌ Meta returned an error — throw so QStash retries
            const errMsg = data.error?.message || `Meta API error ${response.status}`;
            console.error(`[Campaign Queue] Meta API Error for ${msg.phone}:`, errMsg);
            throw new Error(errMsg);
        }

    } catch (error: any) {
        console.error("[Campaign Queue Error]:", error.message);

        // If we have the message record and it's exhausted retries, mark as failed
        if (msg) {
            msg.status = "failed";
            msg.errorMessage = error.message;
            await msg.save().catch(() => { });

            // Update campaign fail counter
            await Campaign.findByIdAndUpdate(
                msg.campaignId,
                { $inc: { failedSends: 1 } }
            ).catch(() => { });
        }

        // Return 500 → QStash will retry this job with exponential backoff
        return new NextResponse(`Error: ${error.message}`, { status: 500 });
    }
}

// Only Upstash QStash can call this endpoint
export const POST = verifySignatureAppRouter(handler);
