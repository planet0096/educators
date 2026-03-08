import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientId = process.env.CALCOM_CLIENT_ID;
        if (!clientId) {
            return NextResponse.json({ error: "Cal.com client ID is not configured." }, { status: 500 });
        }

        // Determine base URL dynamically (works for both localhost and production)
        const url = new URL(req.url);
        const redirectUri = `${url.protocol}//${url.host}/api/calcom/callback`;

        const calAuthUrl = new URL("https://app.cal.com/oauth/authorize");
        calAuthUrl.searchParams.append("client_id", clientId);
        calAuthUrl.searchParams.append("redirect_uri", redirectUri);
        calAuthUrl.searchParams.append("response_type", "code");

        return NextResponse.redirect(calAuthUrl.toString());
    } catch (error: any) {
        console.error("Error initiating Cal.com OAuth:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
