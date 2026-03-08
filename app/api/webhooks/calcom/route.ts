import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CalComIntegration from "@/models/CalComIntegration";
import WhatsAppConfig from "@/models/WhatsAppConfig";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { triggerEvent, payload } = body;

        if (triggerEvent !== "booking.created") {
            return NextResponse.json({ message: "Ignored event type. Only booking.created is processed." }, { status: 200 });
        }

        const calComUserId = payload.user?.id || payload.organizer?.id;
        const calComUsername = payload.organizer?.username || payload.user?.username;

        // Extract Invitee Information
        const invitee = payload.attendees?.[0] || {};
        const inviteeName = invitee.name || "Student";
        const meetingSourcePhone = payload.responses?.phone?.value || invitee.phoneNumber || payload.responses?.['phone-number']?.value;

        if (!meetingSourcePhone) {
            console.log("No phone number found in Cal.com webhook for booking:", payload.uid);
            return NextResponse.json({ message: "No phone number, skipped WhatsApp message" }, { status: 200 });
        }

        const recipientPhone = meetingSourcePhone.replace(/[\+\-\s\(\)]/g, "");

        await dbConnect();

        // Find integration by Cal.com userId, or fallback to username
        let integration = await CalComIntegration.findOne({ calComUserId: calComUserId });
        if (!integration && calComUsername) {
            integration = await CalComIntegration.findOne({ calComUsername: calComUsername });
        }

        if (!integration) {
            console.log(`No integration found for Cal.com user ID: ${calComUserId} / username: ${calComUsername}`);
            return NextResponse.json({ error: "Integration not found" }, { status: 404 });
        }

        const userId = integration.user;

        const waConfig = await WhatsAppConfig.findOne({ user: userId });
        if (!waConfig) {
            console.log(`User ${userId} does not have WhatsApp configured.`);
            return NextResponse.json({ error: "WhatsApp config not found" }, { status: 404 });
        }

        const { phoneNumberId, accessToken } = waConfig;

        const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

        const meetingDate = new Date(payload.startTime).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
        const meetingLink = payload.videoCallData?.url || payload.location || "Check your calendar";

        // NOTE: Replace "booking_confirmation_template" with your actual approved WhatsApp template name
        // The template should have 3 body variables: {{1}} Name, {{2}} Date, {{3}} Link
        const messagePayload = {
            messaging_product: "whatsapp",
            to: recipientPhone,
            type: "template",
            template: {
                name: "booking_confirmation_template",
                language: { code: "en_US" },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: inviteeName },
                            { type: "text", text: meetingDate },
                            { type: "text", text: meetingLink }
                        ]
                    }
                ]
            }
        };

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(messagePayload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("WhatsApp API Error via Cal.com Webhook:", data);
            return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: response.status });
        }

        return NextResponse.json({ success: true, message: "WhatsApp confirmation sent", data }, { status: 200 });

    } catch (error: any) {
        console.error("Error processing Cal.com webhook:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
