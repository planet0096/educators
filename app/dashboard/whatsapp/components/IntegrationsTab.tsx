"use client";
import { useState, useEffect, FormEvent } from "react";
import { Save, Copy, CheckCircle2, RefreshCw, Plus, Store, AlertCircle, X, Activity, Phone, Clock, Send, Loader2, Trash2, ChevronRight, ArrowRight } from "lucide-react";
import { WhatsAppTemplate } from "@/models/WhatsAppTemplateTypes";

// ─── WooCommerce Event Catalog ───────────────────────────────────────────────
const WC_EVENTS: { group: string; events: { value: string; label: string }[] }[] = [
    {
        group: "Order",
        events: [
            { value: "order.created", label: "Order Created" },
            { value: "order.updated", label: "Order Updated" },
            { value: "order.deleted", label: "Order Deleted" },
            { value: "order.restored", label: "Order Restored" },
        ]
    },
    {
        group: "Customer",
        events: [
            { value: "customer.created", label: "Customer Created" },
            { value: "customer.updated", label: "Customer Updated" },
            { value: "customer.deleted", label: "Customer Deleted" },
        ]
    },
    {
        group: "Product",
        events: [
            { value: "product.created", label: "Product Created" },
            { value: "product.updated", label: "Product Updated" },
            { value: "product.deleted", label: "Product Deleted" },
            { value: "product.restored", label: "Product Restored" },
        ]
    },
    {
        group: "Coupon",
        events: [
            { value: "coupon.created", label: "Coupon Created" },
            { value: "coupon.updated", label: "Coupon Updated" },
            { value: "coupon.deleted", label: "Coupon Deleted" },
            { value: "coupon.restored", label: "Coupon Restored" },
        ]
    },
];

// ─── WooCommerce Data Points Per Event Group ─────────────────────────────────
const WC_DATA_POINTS: Record<string, { label: string; path: string }[]> = {
    order: [
        { label: "Order ID", path: "id" },
        { label: "Order Number", path: "number" },
        { label: "Order Status", path: "status" },
        { label: "Order Total", path: "total" },
        { label: "Order Currency", path: "currency" },
        { label: "Customer Note", path: "customer_note" },
        { label: "Payment Method", path: "payment_method_title" },
        { label: "Date Created", path: "date_created" },
        // Billing
        { label: "Billing First Name", path: "billing.first_name" },
        { label: "Billing Last Name", path: "billing.last_name" },
        { label: "Billing Full Name", path: "billing.full_name" },
        { label: "Billing Email", path: "billing.email" },
        { label: "Billing Phone", path: "billing.phone" },
        { label: "Billing Company", path: "billing.company" },
        { label: "Billing Address 1", path: "billing.address_1" },
        { label: "Billing Address 2", path: "billing.address_2" },
        { label: "Billing City", path: "billing.city" },
        { label: "Billing State", path: "billing.state" },
        { label: "Billing Postcode", path: "billing.postcode" },
        { label: "Billing Country", path: "billing.country" },
        // Shipping
        { label: "Shipping First Name", path: "shipping.first_name" },
        { label: "Shipping Last Name", path: "shipping.last_name" },
        { label: "Shipping Address 1", path: "shipping.address_1" },
        { label: "Shipping City", path: "shipping.city" },
        { label: "Shipping State", path: "shipping.state" },
        { label: "Shipping Postcode", path: "shipping.postcode" },
        { label: "Shipping Country", path: "shipping.country" },
        // Totals
        { label: "Subtotal", path: "subtotal" },
        { label: "Discount Total", path: "discount_total" },
        { label: "Shipping Total", path: "shipping_total" },
        { label: "Tax Total", path: "total_tax" },
        // First line item
        { label: "First Item Name", path: "line_items.0.name" },
        { label: "First Item Quantity", path: "line_items.0.quantity" },
        { label: "First Item Total", path: "line_items.0.total" },
    ],
    customer: [
        { label: "Customer ID", path: "id" },
        { label: "First Name", path: "first_name" },
        { label: "Last Name", path: "last_name" },
        { label: "Email", path: "email" },
        { label: "Username", path: "username" },
        { label: "Date Created", path: "date_created" },
        { label: "Billing Phone", path: "billing.phone" },
        { label: "Billing Email", path: "billing.email" },
        { label: "Billing City", path: "billing.city" },
        { label: "Billing Country", path: "billing.country" },
        { label: "Orders Count", path: "orders_count" },
        { label: "Total Spent", path: "total_spent" },
    ],
    product: [
        { label: "Product ID", path: "id" },
        { label: "Product Name", path: "name" },
        { label: "SKU", path: "sku" },
        { label: "Price", path: "price" },
        { label: "Regular Price", path: "regular_price" },
        { label: "Sale Price", path: "sale_price" },
        { label: "Status", path: "status" },
        { label: "Stock Status", path: "stock_status" },
        { label: "Stock Quantity", path: "stock_quantity" },
        { label: "Short Description", path: "short_description" },
        { label: "Permalink", path: "permalink" },
        { label: "Date Created", path: "date_created" },
    ],
    coupon: [
        { label: "Coupon ID", path: "id" },
        { label: "Coupon Code", path: "code" },
        { label: "Discount Type", path: "discount_type" },
        { label: "Amount", path: "amount" },
        { label: "Expiry Date", path: "date_expires" },
        { label: "Usage Count", path: "usage_count" },
        { label: "Usage Limit", path: "usage_limit" },
        { label: "Description", path: "description" },
    ],
};

// Helper: get the event group prefix
function getEventGroup(event: string): string {
    return event.split(".")[0];
}

// Helper: extract template variables from a WhatsApp template
function extractTemplateVars(template: WhatsAppTemplate | undefined): { id: string; label: string }[] {
    if (!template) return [];
    const vars: { id: string; label: string }[] = [];
    template.components.forEach(comp => {
        if (comp.type === "HEADER" && comp.format === "TEXT" && comp.text) {
            const matches = comp.text.match(/\{\{(\d+)\}\}/g);
            if (matches) matches.forEach(m => {
                const n = m.replace(/[{}]/g, "");
                vars.push({ id: `HEADER_${n}`, label: `Header {{${n}}}` });
            });
        }
        if (comp.type === "BODY" && comp.text) {
            const matches = comp.text.match(/\{\{(\d+)\}\}/g);
            if (matches) matches.forEach(m => {
                const n = m.replace(/[{}]/g, "");
                vars.push({ id: `BODY_${n}`, label: `Body {{${n}}}` });
            });
        }
    });
    return vars;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface AutomatedLog {
    _id: string;
    phone: string;
    templateName: string;
    status: "pending" | "sent" | "failed";
    errorMessage?: string;
    messageId?: string;
    createdAt: string;
}

interface WooCommerceIntegration {
    _id: string;
    webhookSecret: string;
    isEnabled: boolean;
    triggers: any[];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function IntegrationsTab() {
    const [integration, setIntegration] = useState<WooCommerceIntegration | null>(null);
    const [educatorId, setEducatorId] = useState<string>("");
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);

    // Logs state
    const [logs, setLogs] = useState<AutomatedLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [processResult, setProcessResult] = useState<string | null>(null);

    // Settings form
    const [isEnabled, setIsEnabled] = useState(false);
    const [webhookSecret, setWebhookSecret] = useState("");
    const [triggers, setTriggers] = useState<any[]>([]);

    // New trigger form
    const [showTriggerForm, setShowTriggerForm] = useState(false);
    const [newEvent, setNewEvent] = useState("order.created");
    const [newTemplate, setNewTemplate] = useState("");
    const [newMappings, setNewMappings] = useState<Record<string, string>>({});

    // Auto-setup state
    const ALL_TOPICS_LIST = [
        { topic: "order.created", label: "Order Created" },
        { topic: "order.updated", label: "Order Updated" },
        { topic: "customer.created", label: "Customer Created" },
        { topic: "customer.updated", label: "Customer Updated" },
        { topic: "product.created", label: "Product Created" },
        { topic: "product.updated", label: "Product Updated" },
        { topic: "coupon.created", label: "Coupon Created" },
        { topic: "coupon.updated", label: "Coupon Updated" },
    ];
    const [showAutoSetup, setShowAutoSetup] = useState(false);
    const [wcStoreUrl, setWcStoreUrl] = useState("");
    const [wcConsumerKey, setWcConsumerKey] = useState("");
    const [wcConsumerSecret, setWcConsumerSecret] = useState("");
    const [selectedTopics, setSelectedTopics] = useState<string[]>(ALL_TOPICS_LIST.map(t => t.topic));
    const [autoSetupLoading, setAutoSetupLoading] = useState(false);
    const [autoSetupResult, setAutoSetupResult] = useState<{ topic: string; status: string; error?: string }[] | null>(null);

    const toggleTopic = (topic: string) => {
        setSelectedTopics(prev =>
            prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
        );
    };

    const handleAutoSetup = async () => {
        if (!wcStoreUrl || !wcConsumerKey || !wcConsumerSecret) return;
        setAutoSetupLoading(true);
        setAutoSetupResult(null);
        try {
            const res = await fetch("/api/whatsapp/integrations/woocommerce/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ storeUrl: wcStoreUrl, consumerKey: wcConsumerKey, consumerSecret: wcConsumerSecret, selectedTopics })
            });
            const data = await res.json();
            if (data.success) {
                setAutoSetupResult(data.results);
            } else {
                setAutoSetupResult([{ topic: "error", status: "failed", error: data.error }]);
            }
        } catch (err: any) {
            setAutoSetupResult([{ topic: "error", status: "failed", error: err.message }]);
        } finally {
            setAutoSetupLoading(false);
        }
    };

    useEffect(() => {
        fetchIntegrationAndTemplates();
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await fetch("/api/whatsapp/automations/logs?limit=30");
            const data = await res.json();
            if (data.success) setLogs(data.messages || []);
        } catch { } finally { setLogsLoading(false); }
    };

    const handleProcessNow = async () => {
        setProcessing(true);
        setProcessResult(null);
        try {
            const res = await fetch("/api/whatsapp/automations/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}"
            });
            const data = await res.json();
            if (data.success) {
                setProcessResult(`Processed ${data.processed} — ${data.sent} sent, ${data.failed} failed.`);
                await fetchLogs();
            } else {
                setProcessResult(data.error || "Unknown error");
            }
        } catch { setProcessResult("Failed to call processor."); }
        finally { setProcessing(false); }
    };

    const fetchIntegrationAndTemplates = async () => {
        setLoading(true);
        try {
            const [intRes, tmplRes] = await Promise.all([
                fetch("/api/whatsapp/integrations/woocommerce"),
                fetch("/api/whatsapp/templates")
            ]);
            const intData = await intRes.json();
            if (intData.success && intData.integration) {
                setIntegration(intData.integration);
                if (intData.integration.educatorId) setEducatorId(intData.integration.educatorId);
                setIsEnabled(intData.integration.isEnabled);
                setWebhookSecret(intData.integration.webhookSecret);
                setTriggers(intData.integration.triggers || []);
            }
            const tmplData = await tmplRes.json();
            if (tmplData.success && tmplData.templates) setTemplates(tmplData.templates);
        } catch (err) {
            console.error("Failed to load WooCommerce integration data", err);
        } finally { setLoading(false); }
    };

    const handleSaveSettings = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveMsg(null);
        try {
            const res = await fetch("/api/whatsapp/integrations/woocommerce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isEnabled, webhookSecret, triggers })
            });
            const data = await res.json();
            if (data.success) {
                setIntegration(data.integration);
                setSaveMsg("Settings saved!");
                setTimeout(() => setSaveMsg(null), 3000);
            }
        } catch { } finally { setSaving(false); }
    };

    const handleCopyWebhook = () => {
        const url = `${window.location.origin}/api/whatsapp/webhooks/woocommerce/${educatorId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // When template changes, auto-build mapping keys from its variables
    const handleTemplateSelect = (templateName: string) => {
        setNewTemplate(templateName);
        const template = templates.find(t => t.name === templateName);
        const vars = extractTemplateVars(template);
        const initial: Record<string, string> = {};
        vars.forEach(v => { initial[v.id] = ""; });
        setNewMappings(initial);
    };

    // When event changes, reset template + mappings
    const handleEventChange = (event: string) => {
        setNewEvent(event);
        setNewTemplate("");
        setNewMappings({});
    };

    const handleAddTrigger = async () => {
        if (!newTemplate) return;
        const templateObj = templates.find(t => t.name === newTemplate);
        const newTriggerObj = {
            event: newEvent,
            templateName: newTemplate,
            templateLanguage: templateObj?.language || "en_US",
            variableMapping: newMappings,
            isActive: true
        };
        const updatedTriggers = [...triggers, newTriggerObj];
        setTriggers(updatedTriggers);
        setSaving(true);
        try {
            const res = await fetch("/api/whatsapp/integrations/woocommerce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ triggers: updatedTriggers })
            });
            const data = await res.json();
            if (data.success && data.integration) {
                setIntegration(data.integration);
                setTriggers(data.integration.triggers);
                setShowTriggerForm(false);
                setNewTemplate("");
                setNewMappings({});
            }
        } catch { } finally { setSaving(false); }
    };

    const handleRemoveTrigger = async (index: number) => {
        const updatedTriggers = triggers.filter((_, i) => i !== index);
        setTriggers(updatedTriggers);
        setSaving(true);
        try {
            await fetch("/api/whatsapp/integrations/woocommerce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ triggers: updatedTriggers })
            });
        } catch { } finally { setSaving(false); }
    };

    if (loading) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    const webhookUrl = educatorId
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/whatsapp/webhooks/woocommerce/${educatorId}`
        : "Loading...";

    const selectedTemplateObj = templates.find(t => t.name === newTemplate);
    const templateVars = extractTemplateVars(selectedTemplateObj);
    const eventGroup = getEventGroup(newEvent);
    const wcDataPoints = WC_DATA_POINTS[eventGroup] || [];

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Integrations</h2>
                <p className="text-zinc-500 mt-1">Connect external platforms to automate your WhatsApp messaging.</p>
            </div>

            {/* WooCommerce Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-100 p-3 rounded-xl">
                            <Store className="w-6 h-6 text-purple-700" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900">WooCommerce</h3>
                            <p className="text-sm text-zinc-500">Automatically send WhatsApp messages based on WooCommerce events.</p>
                        </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <span className="text-sm font-medium text-zinc-700">Integration Active</span>
                        <div
                            onClick={() => setIsEnabled(!isEnabled)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? "bg-emerald-500" : "bg-zinc-300"}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isEnabled ? "translate-x-7" : "translate-x-1"}`} />
                        </div>
                    </label>
                </div>

                <div className="p-6 space-y-8">
                    {/* Step 1: Webhook Setup */}
                    <div>
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                                <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Connect WooCommerce Webhooks</h4>
                            </div>
                            <button
                                onClick={() => setShowAutoSetup(!showAutoSetup)}
                                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
                            >
                                {showAutoSetup ? "Hide Auto-Setup" : "⚡ Auto-Create All Webhooks"}
                            </button>
                        </div>

                        {/* Auto-Setup Panel */}
                        {showAutoSetup && (
                            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 mb-4 space-y-5">
                                <div>
                                    <h5 className="text-sm font-bold text-purple-900 mb-1">Automatic Webhook Setup</h5>
                                    <p className="text-xs text-purple-700">Generate WooCommerce API keys at: <strong>WooCommerce → Settings → Advanced → REST API → Add Key</strong>. Set permissions to <strong>Read/Write</strong>.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">Store URL</label>
                                        <input
                                            type="url"
                                            value={wcStoreUrl}
                                            onChange={e => setWcStoreUrl(e.target.value)}
                                            placeholder="https://yourstore.com"
                                            className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-500 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">Consumer Key</label>
                                        <input
                                            type="text"
                                            value={wcConsumerKey}
                                            onChange={e => setWcConsumerKey(e.target.value)}
                                            placeholder="ck_xxxxxxxxxxxx"
                                            className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-500 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">Consumer Secret</label>
                                        <input
                                            type="password"
                                            value={wcConsumerSecret}
                                            onChange={e => setWcConsumerSecret(e.target.value)}
                                            placeholder="cs_xxxxxxxxxxxx"
                                            className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-500 shadow-sm"
                                        />
                                    </div>
                                </div>

                                {/* Topic Checkboxes */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">Webhook Topics to Create</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setSelectedTopics(ALL_TOPICS_LIST.map(t => t.topic))} className="text-xs text-purple-700 hover:text-purple-900 font-medium">Select All</button>
                                            <span className="text-purple-300">·</span>
                                            <button onClick={() => setSelectedTopics([])} className="text-xs text-purple-700 hover:text-purple-900 font-medium">Clear All</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {ALL_TOPICS_LIST.map(t => (
                                            <label key={t.topic} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs font-medium transition-all ${selectedTopics.includes(t.topic)
                                                    ? "bg-purple-100 border-purple-300 text-purple-900"
                                                    : "bg-white border-purple-100 text-zinc-400 hover:border-purple-200"
                                                }`}>
                                                <input
                                                    type="checkbox"
                                                    className="accent-purple-600"
                                                    checked={selectedTopics.includes(t.topic)}
                                                    onChange={() => toggleTopic(t.topic)}
                                                />
                                                {t.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleAutoSetup}
                                        disabled={autoSetupLoading || !wcStoreUrl || !wcConsumerKey || !wcConsumerSecret || selectedTopics.length === 0}
                                        className="bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-800 transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm"
                                    >
                                        {autoSetupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>⚡</span>}
                                        {autoSetupLoading ? "Creating Webhooks…" : `Create ${selectedTopics.length} Webhooks in WooCommerce`}
                                    </button>
                                </div>

                                {/* Results */}
                                {autoSetupResult && (
                                    <div className="space-y-2">
                                        <h6 className="text-xs font-bold text-purple-800 uppercase tracking-wide">Results</h6>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {autoSetupResult.map((r, i) => (
                                                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${r.status === "created"
                                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                                        : "bg-red-50 border-red-200 text-red-700"
                                                    }`}>
                                                    <span>{r.status === "created" ? "✅" : "❌"}</span>
                                                    <span className="truncate">{r.topic}</span>
                                                    {r.error && <span className="truncate text-red-500" title={r.error}>({r.error})</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Manual Fallback */}
                        <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 space-y-3">
                            <p className="text-sm text-zinc-600">
                                <span className="font-medium text-zinc-800">Manual setup:</span> In WordPress go to <strong>WooCommerce → Settings → Advanced → Webhooks</strong>, copy this URL as the Delivery URL:
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-700 truncate shadow-sm">
                                    {webhookUrl}
                                </code>
                                <button
                                    onClick={handleCopyWebhook}
                                    className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${copied ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"}`}
                                >
                                    {copied ? <><CheckCircle2 className="w-4 h-4 inline mr-1" />Copied</> : <><Copy className="w-4 h-4 inline mr-1" />Copy</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Secret */}
                    <form onSubmit={handleSaveSettings}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-7 h-7 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                            <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Enter Your Webhook Secret</h4>
                        </div>
                        <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 space-y-3">
                            <p className="text-sm text-zinc-600">
                                Copy the <strong>Secret</strong> shown in WooCommerce and paste it here. This is used to verify all incoming webhook requests.
                            </p>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={webhookSecret}
                                    onChange={(e) => setWebhookSecret(e.target.value)}
                                    placeholder="Paste your WooCommerce Webhook Secret…"
                                    className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-zinc-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                            </div>
                            {saveMsg && (
                                <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" />{saveMsg}
                                </p>
                            )}
                        </div>
                    </form>

                    {/* Step 3: Message Triggers */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                                <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Message Triggers</h4>
                            </div>
                            <button
                                onClick={() => setShowTriggerForm(!showTriggerForm)}
                                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Trigger
                            </button>
                        </div>

                        {/* Add Trigger Form */}
                        {showTriggerForm && (
                            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 mb-5 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-sm font-bold text-zinc-900">New Message Trigger</h5>
                                    <button onClick={() => setShowTriggerForm(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Event + Template Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">WooCommerce Event</label>
                                        <select
                                            value={newEvent}
                                            onChange={(e) => handleEventChange(e.target.value)}
                                            className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-sm"
                                        >
                                            {WC_EVENTS.map(group => (
                                                <optgroup key={group.group} label={group.group}>
                                                    {group.events.map(e => (
                                                        <option key={e.value} value={e.value}>{e.label}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">WhatsApp Template</label>
                                        <select
                                            value={newTemplate}
                                            onChange={(e) => handleTemplateSelect(e.target.value)}
                                            className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-sm"
                                        >
                                            <option value="">— Select a template —</option>
                                            {templates.map(t => (
                                                <option key={t.name} value={t.name}>{t.name} ({t.language})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Two-column Variable Mapping */}
                                {newTemplate && templateVars.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <h6 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Variable Mapping</h6>
                                            <span className="text-xs text-zinc-400">— map each template variable to a WooCommerce data field</span>
                                        </div>

                                        {/* Header Row */}
                                        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center px-3">
                                            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Template Variable</span>
                                            <span className="w-6" />
                                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">WooCommerce Field ({eventGroup})</span>
                                        </div>

                                        {/* Mapping Rows */}
                                        <div className="space-y-2">
                                            {templateVars.map(v => (
                                                <div key={v.id} className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                                                        <span className="text-sm font-semibold text-zinc-800">{v.label}</span>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                                                    <select
                                                        value={newMappings[v.id] || ""}
                                                        onChange={(e) => setNewMappings(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                    >
                                                        <option value="">— Select field —</option>
                                                        {wcDataPoints.map(dp => (
                                                            <option key={dp.path} value={dp.path}>{dp.label} ({dp.path})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {newTemplate && templateVars.length === 0 && (
                                    <p className="text-sm text-zinc-500 bg-zinc-100 rounded-xl px-4 py-3">
                                        This template has no dynamic variables. It will be sent as-is.
                                    </p>
                                )}

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleAddTrigger}
                                        disabled={!newTemplate || saving}
                                        className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Save Trigger
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Existing Triggers List */}
                        <div className="space-y-3">
                            {triggers.length === 0 ? (
                                <div className="text-center py-8 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                                    <ChevronRight className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                                    <p className="text-sm text-zinc-500">No triggers configured yet. Add one above.</p>
                                </div>
                            ) : (
                                triggers.map((trigger, idx) => {
                                    const mappingEntries = Object.entries(
                                        trigger.variableMapping instanceof Map
                                            ? Object.fromEntries(trigger.variableMapping)
                                            : trigger.variableMapping || {}
                                    );
                                    return (
                                        <div key={idx} className="bg-white border border-zinc-200 rounded-xl overflow-hidden group shadow-sm">
                                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                                                        {trigger.event}
                                                    </span>
                                                    <span className="text-zinc-400 text-sm">→</span>
                                                    <span className="text-sm font-semibold text-zinc-900">{trigger.templateName}</span>
                                                    <span className="text-xs text-zinc-400">({trigger.templateLanguage})</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveTrigger(idx)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {mappingEntries.length > 0 && (
                                                <div className="px-5 py-3 bg-zinc-50/50">
                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                                        {mappingEntries.map(([varKey, wcPath]) => (
                                                            <div key={varKey} className="flex items-center gap-2 text-xs text-zinc-600">
                                                                <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{varKey}</span>
                                                                <ArrowRight className="w-3 h-3 text-zinc-300" />
                                                                <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded truncate">{String(wcPath)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Automated Message Logs */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2.5 rounded-xl">
                            <Activity className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-zinc-900">Automated Message Logs</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Last 30 messages triggered by WooCommerce events</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {processResult && (
                            <span className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg">{processResult}</span>
                        )}
                        <button
                            onClick={handleProcessNow}
                            disabled={processing}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-70 shadow-sm"
                        >
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Process Pending
                        </button>
                        <button onClick={fetchLogs} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                            <RefreshCw className={`w-4 h-4 text-zinc-400 ${logsLoading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-zinc-100">
                    {logsLoading ? (
                        <div className="flex items-center justify-center py-10 gap-3 text-zinc-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Loading logs…</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Activity className="w-6 h-6 text-zinc-400" />
                            </div>
                            <p className="text-sm font-medium text-zinc-500">No automated messages yet</p>
                            <p className="text-xs text-zinc-400 mt-1">Messages appear here when WooCommerce fires a configured trigger</p>
                        </div>
                    ) : (
                        logs.map(log => (
                            <div key={log._id} className="px-5 py-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === "sent" ? "bg-emerald-500" : log.status === "failed" ? "bg-red-500" : "bg-amber-400"}`} />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                            <Phone className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span className="text-sm font-semibold text-zinc-900">+{log.phone}</span>
                                            <span className="text-zinc-300">·</span>
                                            <span className="text-xs text-zinc-500 font-mono">{log.templateName}</span>
                                        </div>
                                        {log.errorMessage && <p className="text-xs text-red-500 truncate">{log.errorMessage}</p>}
                                        {log.messageId && <p className="text-xs text-zinc-400 font-mono truncate">ID: {log.messageId}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${log.status === "sent" ? "bg-emerald-50 text-emerald-700" : log.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                                        {log.status}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        {new Date(log.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
