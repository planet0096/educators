import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComIntegration from "@/models/CalComIntegration";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
            return NextResponse.redirect(new URL("/settings/integrations?error=" + error, req.url));
        }

        if (!code) {
            return NextResponse.json({ error: "No authorization code provided" }, { status: 400 });
        }

        const clientId = process.env.CALCOM_CLIENT_ID;
        const clientSecret = process.env.CALCOM_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: "Cal.com OAuth credentials not configured." }, { status: 500 });
        }

        // Determine redirect URI
        const url = new URL(req.url);
        const redirectUri = `${url.protocol}//${url.host}/api/calcom/callback`;

        // 1. Exchange code for token
        // Using the typical /exchange or /token endpoint for Cal.com OAuth
        const tokenResponse = await fetch("https://api.cal.com/v1/oauth/exchange", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
                code: code,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error("Cal.com token error payload:", tokenData);
            return NextResponse.redirect(new URL("/settings/integrations?error=calcom_auth_failed", req.url));
        }

        const { access_token, refresh_token, expires_in } = tokenData;

        // 2. Fetch the connected user's profile from Cal.com
        const meResponse = await fetch("https://api.cal.com/v1/users/me", {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const meData = await meResponse.json();
        const calComUserId = meData?.user?.id;
        const calComUsername = meData?.user?.username || meData?.user?.email || "Unknown";

        if (!calComUserId) {
            throw new Error("Could not fetch user profile from Cal.com");
        }

        // 3. Save to database
        await dbConnect();

        // Calculate expiry (fallback to 30 days if expires_in is missing)
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + (expires_in || 2592000));

        await CalComIntegration.findOneAndUpdate(
            { user: session.user.id },
            {
                user: session.user.id,
                accessToken: access_token,
                refreshToken: refresh_token || "", // some OAuth APIs might not return refresh token initially
                calComUserId: calComUserId,
                calComUsername: calComUsername,
                expiry: expiryDate,
            },
            { upsert: true, new: true }
        );

        // Redirect to integration page
        return NextResponse.redirect(new URL("/dashboard?calcom_success=true", req.url));
    } catch (err: any) {
        console.error("Cal.com callback error:", err);
        return NextResponse.redirect(new URL("/dashboard?error=calcom_internal_error", req.url));
    }
}
