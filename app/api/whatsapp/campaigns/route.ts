import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Campaign from "@/models/Campaign";
import CampaignMessage from "@/models/CampaignMessage";
import Contact from "@/models/Contact";
import WhatsAppConfig from "@/models/WhatsAppConfig";
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN || "" });

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const [campaigns, total] = await Promise.all([
            Campaign.find({ educatorId: session.user.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Campaign.countDocuments({ educatorId: session.user.id })
        ]);

        return NextResponse.json({
            campaigns,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching Campaigns:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, templateName, templateLanguage, targetLists, targetTags, baseComponents } = body;

        if (!name || !templateName || !templateLanguage || (!targetLists?.length && !targetTags?.length)) {
            return NextResponse.json({ error: "Missing required fields or audience targeting" }, { status: 400 });
        }

        await dbConnect();

        // 1. Resolve contacts based on targeted lists/tags
        const query: any = { educatorId: session.user.id };

        if (targetLists?.length > 0 && targetTags?.length > 0) {
            query.$or = [
                { lists: { $in: targetLists } },
                { tags: { $in: targetTags } }
            ];
        } else if (targetLists?.length > 0) {
            query.lists = { $in: targetLists };
        } else if (targetTags?.length > 0) {
            query.tags = { $in: targetTags };
        }

        const targetContacts = await Contact.find(query).select("_id phone name email").lean();

        if (targetContacts.length === 0) {
            return NextResponse.json({ error: "No contacts found for the selected audience." }, { status: 400 });
        }

        // 2. Create the parent Campaign record
        const newCampaign = await Campaign.create({
            educatorId: session.user.id,
            name,
            templateName,
            templateLanguage,
            status: "pending",
            totalContacts: targetContacts.length,
            successfulSends: 0,
            failedSends: 0
        });

        const baseComponentsString = JSON.stringify(baseComponents || []);

        // 3. Prepare queue messages
        const queueMessages = targetContacts.map(contact => {
            let personalizedComponentsString = baseComponentsString;
            personalizedComponentsString = personalizedComponentsString.replace(/\{\{CONTACT_NAME\}\}/g, contact.name || "");
            personalizedComponentsString = personalizedComponentsString.replace(/\{\{CONTACT_PHONE\}\}/g, contact.phone || "");
            personalizedComponentsString = personalizedComponentsString.replace(/\{\{CONTACT_EMAIL\}\}/g, contact.email || "");

            let personalizedComponents = [];
            try {
                personalizedComponents = JSON.parse(personalizedComponentsString);
            } catch (e) {
                console.error("Failed to parse personalized components for contact", contact._id);
            }

            return {
                campaignId: newCampaign._id,
                contactId: contact._id,
                phone: contact.phone,
                components: personalizedComponents,
                status: "pending"
            };
        });

        // 4. Bulk insert into CampaignMessage queue
        const insertedMessages = await CampaignMessage.insertMany(queueMessages);

        // 5. Mark campaign as running immediately
        newCampaign.status = "running";
        await newCampaign.save();

        // 6. Dispatch — QStash in production, direct inline processing in local dev
        const isLocalDev = (process.env.NEXTAUTH_URL || "").includes("localhost");

        if (!isLocalDev && process.env.QSTASH_TOKEN) {
            // ── PRODUCTION: push each contact as an independent QStash background job ──
            const consumerUrl = `${process.env.NEXTAUTH_URL}/api/whatsapp/campaigns/queue`;
            const batchPublishes = (insertedMessages as any[]).map((msg, idx) =>
                qstash.publishJSON({
                    url: consumerUrl,
                    body: { campaignMessageId: msg._id.toString() },
                    retries: 2,
                    delay: Math.floor(idx / 10), // 1s delay per 10 contacts — respects Meta rate limits
                })
            );
            await Promise.allSettled(batchPublishes);
            console.log(`[Campaign] Dispatched ${insertedMessages.length} QStash jobs for campaign ${newCampaign._id}`);
        } else {
            // ── LOCAL DEV: QStash can't hit localhost, so process inline here ──
            console.log(`[Campaign] Local dev — processing ${insertedMessages.length} messages directly`);
            const whatsappConfig = await WhatsAppConfig.findOne({ user: session.user.id });

            if (whatsappConfig?.phoneNumberId && whatsappConfig?.accessToken) {
                const apiUrl = `https://graph.facebook.com/v19.0/${whatsappConfig.phoneNumberId}/messages`;
                let successCount = 0;
                let failCount = 0;

                for (const msg of insertedMessages as any[]) {
                    try {
                        const payload: any = {
                            messaging_product: "whatsapp",
                            to: msg.phone,
                            type: "template",
                            template: {
                                name: newCampaign.templateName,
                                language: { code: newCampaign.templateLanguage }
                            }
                        };
                        if (msg.components?.length > 0) payload.template.components = msg.components;

                        const apiRes = await fetch(apiUrl, {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${whatsappConfig.accessToken}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(payload)
                        });
                        const data = await apiRes.json();

                        if (apiRes.ok && data.messages?.[0]?.id) {
                            await CampaignMessage.findByIdAndUpdate(msg._id, { status: "sent", messageId: data.messages[0].id });
                            successCount++;
                        } else {
                            await CampaignMessage.findByIdAndUpdate(msg._id, { status: "failed", errorMessage: data.error?.message || "Meta API Error" });
                            failCount++;
                        }
                    } catch (err: any) {
                        await CampaignMessage.findByIdAndUpdate(msg._id, { status: "failed", errorMessage: err.message });
                        failCount++;
                    }
                }

                newCampaign.status = "completed";
                newCampaign.successfulSends = successCount;
                newCampaign.failedSends = failCount;
                await newCampaign.save();
                console.log(`[Campaign] Done. Sent: ${successCount}, Failed: ${failCount}`);
            } else {
                console.warn("[Campaign] No WhatsApp config found — messages saved as pending.");
            }
        }

        return NextResponse.json({
            success: true,
            campaign: newCampaign,
            messageCount: queueMessages.length
        }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating Campaign:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
