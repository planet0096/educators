import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import WooCommerceIntegration from "@/models/WooCommerceIntegration";

// All WooCommerce webhook topics we support
const ALL_TOPICS = [
    // Orders
    { topic: "order.created", name: "WA - Order Created" },
    { topic: "order.updated", name: "WA - Order Updated" },
    // Customers
    { topic: "customer.created", name: "WA - Customer Created" },
    { topic: "customer.updated", name: "WA - Customer Updated" },
    // Products
    { topic: "product.created", name: "WA - Product Created" },
    { topic: "product.updated", name: "WA - Product Updated" },
    // Coupons
    { topic: "coupon.created", name: "WA - Coupon Created" },
    { topic: "coupon.updated", name: "WA - Coupon Updated" },
];

// POST /api/whatsapp/integrations/woocommerce/setup
// Programmatically creates all webhooks in WooCommerce via its REST API
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const body = await req.json();
        const { storeUrl, consumerKey, consumerSecret, selectedTopics } = body;

        if (!storeUrl || !consumerKey || !consumerSecret) {
            return NextResponse.json({ error: "Store URL, Consumer Key, and Consumer Secret are required" }, { status: 400 });
        }

        // Fetch WooCommerce integration to get the webhook URL and secret
        const integration = await WooCommerceIntegration.findOne({ educatorId: session.user.id });
        if (!integration) {
            return NextResponse.json({ error: "WooCommerce integration not configured. Please set it up first." }, { status: 404 });
        }

        // Build the delivery URL
        const deliveryUrl = `${req.nextUrl.origin}/api/whatsapp/webhooks/woocommerce/${session.user.id}`;

        // Normalize the store URL
        const baseUrl = storeUrl.replace(/\/$/, "");
        const wcApiBase = `${baseUrl}/wp-json/wc/v3/webhooks`;

        const authHeader = "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

        const topicsToCreate = (selectedTopics?.length > 0 ? ALL_TOPICS.filter(t => selectedTopics.includes(t.topic)) : ALL_TOPICS);

        const results: { topic: string; status: "created" | "failed"; error?: string; id?: number }[] = [];

        // Create each webhook sequentially to avoid rate-limiting
        for (const wh of topicsToCreate) {
            try {
                const res = await fetch(wcApiBase, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: authHeader,
                    },
                    body: JSON.stringify({
                        name: wh.name,
                        topic: wh.topic,
                        delivery_url: deliveryUrl,
                        secret: integration.webhookSecret,
                        status: "active",
                    }),
                });

                const data = await res.json();

                if (res.ok && data.id) {
                    results.push({ topic: wh.topic, status: "created", id: data.id });
                } else {
                    results.push({ topic: wh.topic, status: "failed", error: data.message || `HTTP ${res.status}` });
                }
            } catch (err: any) {
                results.push({ topic: wh.topic, status: "failed", error: err.message });
            }
        }

        const created = results.filter(r => r.status === "created").length;
        const failed = results.filter(r => r.status === "failed").length;

        return NextResponse.json({
            success: true,
            results,
            summary: { created, failed, total: results.length }
        });

    } catch (error: any) {
        console.error("[WooCommerce Auto-Setup Error]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
