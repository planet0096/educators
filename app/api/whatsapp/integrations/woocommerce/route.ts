import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import WooCommerceIntegration from "@/models/WooCommerceIntegration";
import mongoose from "mongoose";

// GET fetching integration settings
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        let integration = await WooCommerceIntegration.findOne({
            educatorId: session.user.id
        });

        // Initialize if it doesn't exist
        if (!integration) {
            // Generate a random 32-character hex secret for webhook signing
            const secret = Array.from(Array(32), () => Math.floor(Math.random() * 16).toString(16)).join('');

            integration = await WooCommerceIntegration.create({
                educatorId: session.user.id,
                webhookSecret: secret,
                isEnabled: false,
                triggers: []
            });
        }

        return NextResponse.json({
            success: true,
            integration
        });

    } catch (error: any) {
        console.error("GET WooCommerce Config Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST update integration settings
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Destructure allowed update fields
        const { isEnabled, webhookSecret, triggers } = body;

        await dbConnect();

        const integration = await WooCommerceIntegration.findOneAndUpdate(
            { educatorId: session.user.id },
            {
                $set: {
                    ...(isEnabled !== undefined && { isEnabled }),
                    ...(webhookSecret !== undefined && { webhookSecret }),
                    ...(triggers !== undefined && { triggers }),
                }
            },
            { new: true, upsert: true }
        );

        return NextResponse.json({
            success: true,
            integration
        });

    } catch (error: any) {
        console.error("POST WooCommerce Config Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
