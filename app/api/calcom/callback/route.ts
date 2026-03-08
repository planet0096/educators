import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CalComIntegration from "@/models/CalComIntegration";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            console.error("[CalCom Callback] No session found.");
            return NextResponse.redirect(new URL("/login", req.url));
        }

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
            console.error("[CalCom Callback] Cal.com returned error:", error);
            return NextResponse.redirect(new URL("/dashboard/integrations?error=" + encodeURIComponent(error), req.url));
        }

        if (!code) {
            return NextResponse.redirect(new URL("/dashboard/integrations?error=no_code", req.url));
        }

        const clientId = process.env.CALCOM_CLIENT_ID;
        const clientSecret = process.env.CALCOM_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL("/dashboard/integrations?error=missing_env_vars", req.url));
        }

        const url = new URL(req.url);
        const redirectUri = `${url.protocol}//${url.host}/api/calcom/callback`;

        // --- Attempt 1: app.cal.com endpoint ---
        let access_token: string | undefined;
        let refresh_token: string | undefined;
        let expires_in: number | undefined;
        let tokenErrorMsg = "";

        const endpoints = [
            "https://app.cal.com/api/auth/oauth/token",
            "https://api.cal.com/v2/oauth/token",
        ];

        for (const endpoint of endpoints) {
            const tokenResponse = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: "authorization_code",
                    code: code,
                }),
            });

            const tokenData = await tokenResponse.json();
            console.log(`[CalCom Callback] ${endpoint} => status:${tokenResponse.status} body:`, JSON.stringify(tokenData));

            if (tokenResponse.ok && tokenData.access_token) {
                access_token = tokenData.access_token;
                refresh_token = tokenData.refresh_token;
                expires_in = tokenData.expires_in;
                break;
            } else {
                tokenErrorMsg = `${endpoint} => ${tokenResponse.status}: ${JSON.stringify(tokenData)}`;
            }
        }

        if (!access_token) {
            // Surface the actual error in the URL params so user can share it
            const safeMsg = encodeURIComponent(tokenErrorMsg.slice(0, 200));
            return NextResponse.redirect(new URL(`/dashboard/integrations?error=token_failed&detail=${safeMsg}`, req.url));
        }

        // --- Fetch Cal.com user profile ---
        let calComUserId: number = 0;
        let calComUsername: string = "Connected";

        try {
            const meRes = await fetch("https://api.cal.com/v2/me", {
                headers: { Authorization: `Bearer ${access_token}`, "cal-api-version": "2024-08-13" },
            });
            const meData = await meRes.json();
            console.log("[CalCom Callback] /v2/me:", JSON.stringify(meData));
            calComUserId = meData?.data?.id || meData?.id || 0;
            calComUsername = meData?.data?.username || meData?.data?.email || meData?.username || "Connected";
        } catch (meErr) {
            console.warn("[CalCom Callback] Could not fetch profile, proceeding without it.");
        }

        // --- Save to DB ---
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

        console.log("[CalCom Callback] ✅ Integration saved for user:", session.user.id);
        return NextResponse.redirect(new URL("/dashboard/integrations?calcom_success=true", req.url));

    } catch (err: any) {
        console.error("[CalCom Callback] Unexpected error:", err?.message, err?.stack);
        return NextResponse.redirect(new URL("/dashboard/integrations?error=exception&detail=" + encodeURIComponent(String(err?.message || err)), req.url));
    }
}
