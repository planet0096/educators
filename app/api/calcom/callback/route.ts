import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComIntegration from "@/models/CalComIntegration";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            console.error("[CalCom Callback] No session found - user must be logged in.");
            return NextResponse.redirect(new URL("/login", req.url));
        }

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
            console.error("[CalCom Callback] Cal.com returned error:", error);
            return NextResponse.redirect(new URL("/dashboard/integrations?error=" + error, req.url));
        }

        if (!code) {
            console.error("[CalCom Callback] No code in query params");
            return NextResponse.redirect(new URL("/dashboard/integrations?error=no_code", req.url));
        }

        const clientId = process.env.CALCOM_CLIENT_ID;
        const clientSecret = process.env.CALCOM_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error("[CalCom Callback] Missing CALCOM_CLIENT_ID or CALCOM_CLIENT_SECRET env vars");
            return NextResponse.redirect(new URL("/dashboard/integrations?error=not_configured", req.url));
        }

        // Determine redirect URI
        const url = new URL(req.url);
        const redirectUri = `${url.protocol}//${url.host}/api/calcom/callback`;

        console.log("[CalCom Callback] Exchanging code for token. Redirect URI:", redirectUri);

        // 1. Exchange code for token
        // Note: Using app.cal.com endpoint which is confirmed working
        const tokenResponse = await fetch("https://app.cal.com/api/auth/oauth/token", {
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
        console.log("[CalCom Callback] Token response status:", tokenResponse.status, "body:", JSON.stringify(tokenData));

        if (!tokenResponse.ok) {
            console.error("[CalCom Callback] Token exchange failed:", tokenData);
            return NextResponse.redirect(new URL("/dashboard/integrations?error=token_exchange_failed", req.url));
        }

        const { access_token, refresh_token, expires_in } = tokenData;

        if (!access_token) {
            console.error("[CalCom Callback] No access_token in response:", tokenData);
            return NextResponse.redirect(new URL("/dashboard/integrations?error=no_access_token", req.url));
        }

        // 2. Fetch the connected user's Cal.com profile
        // Try v2/me first, fallback to v1
        let calComUserId: number | undefined;
        let calComUsername: string = "Unknown";

        const meResV2 = await fetch("https://api.cal.com/v2/me", {
            headers: {
                Authorization: `Bearer ${access_token}`,
                "cal-api-version": "2024-08-13",
            },
        });
        const meDataV2 = await meResV2.json();
        console.log("[CalCom Callback] /v2/me response:", JSON.stringify(meDataV2));

        if (meResV2.ok && (meDataV2?.data?.id || meDataV2?.id)) {
            calComUserId = meDataV2?.data?.id || meDataV2?.id;
            calComUsername = meDataV2?.data?.username || meDataV2?.data?.email || meDataV2?.username || "Unknown";
        } else {
            // Fallback to v1
            const meResV1 = await fetch("https://api.cal.com/v1/me?apiKey=" + access_token);
            const meDataV1 = await meResV1.json();
            console.log("[CalCom Callback] /v1/me response:", JSON.stringify(meDataV1));
            calComUserId = meDataV1?.user?.id || meDataV1?.id;
            calComUsername = meDataV1?.user?.username || meDataV1?.user?.email || meDataV1?.username || "Unknown";
        }

        // If we still can't get the user ID, we store a placeholder so connection still succeeds
        // This can happen if the token endpoint uses a different format
        if (!calComUserId) {
            console.warn("[CalCom Callback] Could not determine calComUserId. Storing placeholder.");
            calComUserId = 0;
        }

        // 3. Save to database
        await dbConnect();

        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + (expires_in || 2592000));

        await CalComIntegration.findOneAndUpdate(
            { user: session.user.id },
            {
                user: session.user.id,
                accessToken: access_token,
                refreshToken: refresh_token || "",
                calComUserId: calComUserId,
                calComUsername: calComUsername,
                expiry: expiryDate,
            },
            { upsert: true, new: true }
        );

        console.log("[CalCom Callback] Integration saved successfully for user:", session.user.id);

        return NextResponse.redirect(new URL("/dashboard/integrations?calcom_success=true", req.url));
    } catch (err: any) {
        console.error("[CalCom Callback] Unexpected error:", err?.message, err?.stack);
        return NextResponse.redirect(new URL("/dashboard/integrations?error=calcom_internal_error", req.url));
    }
}
