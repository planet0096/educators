import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComIntegration from "@/models/CalComIntegration";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ connected: false });
        }

        await dbConnect();
        const integration = await CalComIntegration.findOne({ user: session.user.id });

        if (integration && integration.apiKey) {
            return NextResponse.json({
                connected: true,
                username: integration.calComUsername
            });
        }

        return NextResponse.json({ connected: false });
    } catch (err: any) {
        console.error("Error fetching Cal.com auth status:", err);
        return NextResponse.json({ connected: false, error: err.message }, { status: 500 });
    }
}
