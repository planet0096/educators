import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComIntegration from "@/models/CalComIntegration";

// GET /api/calcom/event-types — fetches event types from the Cal.com API using the user's API key
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const integration = await CalComIntegration.findOne({ user: session.user.id });

    if (!integration?.apiKey) {
        return NextResponse.json({ error: "Cal.com is not connected" }, { status: 400 });
    }

    try {
        const res = await fetch("https://api.cal.com/v1/event-types", {
            headers: {
                "Content-Type": "application/json",
            },
            // Cal.com API v1 expects the apiKey as a query param
        });

        const fullUrl = `https://api.cal.com/v1/event-types?apiKey=${integration.apiKey}`;
        const fetchRes = await fetch(fullUrl, {
            headers: { "Content-Type": "application/json" }
        });

        const data = await fetchRes.json();

        if (!fetchRes.ok) {
            return NextResponse.json({ error: data?.message || "Failed to fetch event types" }, { status: 400 });
        }

        const eventTypes = data.event_types.map((et: any) => ({
            id: et.id,
            title: et.title,
            slug: et.slug,
            length: et.length,
        }));

        return NextResponse.json({ success: true, eventTypes });

    } catch (err: any) {
        console.error("[Event Types API] Error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
