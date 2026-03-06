import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Campaign from "@/models/Campaign";
import CampaignMessage from "@/models/CampaignMessage";
import WhatsAppConfig from "@/models/WhatsAppConfig";

// How many messages to process per API call (to prevent Vercel/Lambda timeouts)
const BATCH_SIZE = 10;

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { campaignId } = body;

        if (!campaignId) {
            return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
        }

        await dbConnect();

        // 1. Verify Campaign and Config
        const campaign = await Campaign.findOne({ _id: campaignId, educatorId: session.user.id });
        if (!campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        if (campaign.status === "completed" || campaign.status === "failed") {
            return NextResponse.json({ message: "Campaign is already finished", status: campaign.status });
        }

        const config = await WhatsAppConfig.findOne({ user: session.user.id });
        if (!config || !config.phoneNumberId || !config.accessToken) {
            // Update campaign as failed if no valid config
            campaign.status = "failed";
            await campaign.save();
            return NextResponse.json({ error: "WhatsApp config missing or invalid" }, { status: 400 });
        }

        // Mark as running if it was pending
        if (campaign.status === "pending") {
            campaign.status = "running";
            await campaign.save();
        }

        // 2. Fetch the next batch of pending messages
        const pendingMessages = await CampaignMessage.find({
            campaignId: campaign._id,
            status: "pending"
        }).limit(BATCH_SIZE);

        if (pendingMessages.length === 0) {
            // If no more pending messages, mark campaign as completed
            campaign.status = "completed";
            await campaign.save();
            return NextResponse.json({ message: "Campaign completed successfully", processed: 0 });
        }

        // 3. Process the batch
        const apiUrl = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;
        let successfulCount = 0;
        let failedCount = 0;

        // Using Promise.allSettled to process the batch concurrently without failing the entire batch if one fails
        const sendPromises = pendingMessages.map(async (msg) => {
            try {
                const payload: any = {
                    messaging_product: "whatsapp",
                    to: msg.phone,
                    type: "template",
                    template: {
                        name: campaign.templateName,
                        language: {
                            code: campaign.templateLanguage
                        }
                    }
                };

                if (msg.components && msg.components.length > 0) {
                    payload.template.components = msg.components;
                }

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${config.accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok && data.messages && data.messages.length > 0) {
                    msg.status = "sent";
                    msg.messageId = data.messages[0].id;
                    successfulCount++;
                } else {
                    msg.status = "failed";
                    msg.errorMessage = data.error?.message || "Unknown Meta API Error";
                    failedCount++;
                }
            } catch (error: any) {
                msg.status = "failed";
                msg.errorMessage = error.message || "Network Error";
                failedCount++;
            }

            // Save the updated message status
            await msg.save();
        });

        await Promise.allSettled(sendPromises);

        // 4. Update the campaign progress
        campaign.successfulSends += successfulCount;
        campaign.failedSends += failedCount;
        await campaign.save();

        // 5. Check if we just finished the last batch
        const remainingPending = await CampaignMessage.countDocuments({
            campaignId: campaign._id,
            status: "pending"
        });

        if (remainingPending === 0) {
            campaign.status = "completed";
            await campaign.save();
        }

        return NextResponse.json({
            success: true,
            processed: pendingMessages.length,
            successes: successfulCount,
            failures: failedCount,
            remaining: remainingPending,
            campaignStatus: campaign.status
        });

    } catch (error: any) {
        console.error("Error processing Campaign queue:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
