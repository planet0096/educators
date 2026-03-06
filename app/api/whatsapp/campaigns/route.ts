import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Campaign from "@/models/Campaign";
import CampaignMessage from "@/models/CampaignMessage";
import Contact from "@/models/Contact";

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
            // Apply personalization directly to the components JSON string
            let personalizedComponentsString = baseComponentsString;

            // Standard system variables replacement
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
        await CampaignMessage.insertMany(queueMessages);

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
