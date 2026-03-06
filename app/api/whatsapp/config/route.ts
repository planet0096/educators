import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import WhatsAppConfig from "@/models/WhatsAppConfig";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const config = await WhatsAppConfig.findOne({ user: session.user.id });

        return NextResponse.json({ success: true, config: config || null }, { status: 200 });
    } catch (error: any) {
        console.error("Error fetching WhatsApp config:", error);
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
        const { appId, phoneNumberId, accessToken, wabaId } = body;

        if (!appId || !phoneNumberId || !accessToken || !wabaId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();

        const updatedConfig = await WhatsAppConfig.findOneAndUpdate(
            { user: session.user.id },
            { $set: { appId, phoneNumberId, accessToken, wabaId } },
            { new: true, upsert: true, runValidators: true }
        );

        return NextResponse.json({ success: true, config: updatedConfig }, { status: 200 });
    } catch (error: any) {
        console.error("Error saving WhatsApp config:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
