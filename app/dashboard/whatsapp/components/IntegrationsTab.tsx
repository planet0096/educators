import { useState, useEffect, FormEvent } from "react";
import { Plug, Save, Copy, CheckCircle2, RefreshCw, Plus, Store, KeyRound, AlertCircle, X, ChevronDown, ChevronUp, Activity, Phone, Clock, Send, Loader2 } from "lucide-react";
import { WhatsAppTemplate } from "@/models/WhatsAppTemplateTypes";

interface AutomatedLog {
    _id: string;
    phone: string;
    templateName: string;
    status: 'pending' | 'sent' | 'failed';
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

export default function IntegrationsTab() {
    const [integration, setIntegration] = useState<WooCommerceIntegration | null>(null);
    const [educatorId, setEducatorId] = useState<string>("");
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Logs state
    const [logs, setLogs] = useState<AutomatedLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [processResult, setProcessResult] = useState<string | null>(null);

    // Form state
    const [isEnabled, setIsEnabled] = useState(false);
    const [webhookSecret, setWebhookSecret] = useState("");
    const [triggers, setTriggers] = useState<any[]>([]);

    // New Trigger form state
    const [showTriggerForm, setShowTriggerForm] = useState(false);
    const [newEvent, setNewEvent] = useState("order.created");
    const [newTemplate, setNewTemplate] = useState("");
    const [newMappings, setNewMappings] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchIntegrationAndTemplates();
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await fetch("/api/whatsapp/automations/logs?limit=20");
            const data = await res.json();
            if (data.success) setLogs(data.messages || []);
        } catch (err) {
            console.error("Failed to load logs", err);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleProcessNow = async () => {
        setProcessing(true);
        setProcessResult(null);
        try {
            const res = await fetch("/api/whatsapp/automations/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            const data = await res.json();
            if (data.success) {
                setProcessResult(`Processed ${data.processed} messages — ${data.sent} sent, ${data.failed} failed.`);
                await fetchLogs();
            } else {
                setProcessResult(data.error || "Unknown error");
            }
        } catch (err) {
            setProcessResult("Failed to call processor.");
        } finally {
            setProcessing(false);
        }
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
                if (intData.integration.educatorId) {
                    setEducatorId(intData.integration.educatorId);
                }
                setIsEnabled(intData.integration.isEnabled);
                setWebhookSecret(intData.integration.webhookSecret);
                setTriggers(intData.integration.triggers || []);
            }

            const tmplData = await tmplRes.json();
            if (tmplData.success && tmplData.templates) {
                setTemplates(tmplData.templates);
            }
        } catch (err) {
            console.error("Failed to load WooCommerce integration data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePrimarySettings = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/whatsapp/integrations/woocommerce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isEnabled, webhookSecret, triggers })
            });
            const data = await res.json();
            if (data.success) {
                setIntegration(data.integration);
            }
        } catch (err) {
            console.error("Save failed", err);
        } finally {
            setSaving(false);
        }
    };

    const handleCopyWebhook = () => {
        const url = `${window.location.origin}/api/whatsapp/webhooks/woocommerce/${educatorId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTemplateSelectionForTrigger = (templateName: string) => {
        setNewTemplate(templateName);
        const template = templates.find(t => t.name === templateName);
        if (!template) {
            setNewMappings({});
            return;
        }

        const initialMappings: Record<string, string> = {};

        template.components.forEach(comp => {
            if (comp.type === "HEADER" && comp.format === "TEXT" && comp.text) {
                const matches = comp.text.match(/\{\{(\d+)\}\}/g);
                if (matches) matches.forEach(m => { initialMappings[`HEADER_${m.replace(/[{}]/g, "")}`] = ""; });
            } else if (comp.type === "BODY" && comp.text) {
                const matches = comp.text.match(/\{\{(\d+)\}\}/g);
                if (matches) matches.forEach(m => { initialMappings[`BODY_${m.replace(/[{}]/g, "")}`] = ""; });
            }
        });

        setNewMappings(initialMappings);
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

        // Auto-save the new trigger to DB
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
        } catch (err) {
            console.error("Failed to save trigger", err);
        } finally {
            setSaving(false);
        }
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
        } catch (err) {
            console.error("Failed to remove trigger", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    const webhookUrl = educatorId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/webhooks/woocommerce/${educatorId}` : 'Loading...';

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Integrations</h2>
                <p className="text-zinc-500 mt-1">Connect external platforms to automate your WhatsApp messaging.</p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-100 p-3 rounded-xl">
                            <Store className="w-6 h-6 text-purple-700" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">WooCommerce</h3>
                            <p className="text-sm text-zinc-500">Automatically send WhatsApp receipts, updates, and more using native Webhooks.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="ms-3 text-sm font-medium text-zinc-900">{isEnabled ? 'Active' : 'Inactive'}</span>
                    </label>
                </div>

                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Setup Instructions & Config */}
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-bold text-zinc-900 mb-2 uppercase tracking-wide">1. Setup Webhook URL</h4>
                            <p className="text-sm text-zinc-600 mb-4 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                                In your WordPress admin, go to <strong>WooCommerce &gt; Settings &gt; Advanced &gt; Webhooks</strong>. Click "Add Webhook". Paste the Delivery URL below.
                            </p>

                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Delivery URL (Payload: JSON)</label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-zinc-900 text-emerald-400 p-2.5 rounded-lg text-xs break-all selection:bg-emerald-400/30">
                                    {webhookUrl}
                                </code>
                                <button onClick={handleCopyWebhook} className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 p-2.5 rounded-lg transition-colors flex items-center justify-center shrink-0">
                                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-zinc-900 mb-2 uppercase tracking-wide">2. Secure The Connection</h4>
                            <p className="text-sm text-zinc-600 mb-4 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                                Enter a completely random string as your Webhook Secret in WooCommerce. Then paste that <strong>exact same secret</strong> below so we can verify the signature and guarantee zero errors from fake requests.
                            </p>

                            <form onSubmit={handleSavePrimarySettings} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Webhook Secret Key</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <KeyRound className="h-4 w-4 text-zinc-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={webhookSecret}
                                            onChange={e => setWebhookSecret(e.target.value)}
                                            className="w-full bg-white border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={saving} className="bg-zinc-900 text-white rounded-lg px-6 py-2 text-sm font-bold shadow-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Primary Settings
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Triggers & Mapping */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">3. Message Triggers</h4>
                            {!showTriggerForm && (
                                <button onClick={() => setShowTriggerForm(true)} className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add Trigger
                                </button>
                            )}
                        </div>

                        {showTriggerForm ? (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 space-y-5 relative">
                                <button type="button" onClick={() => setShowTriggerForm(false)} className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-800">
                                    <X className="w-4 h-4" />
                                </button>

                                <div>
                                    <label className="text-xs font-bold text-zinc-700 block mb-1.5">WooCommerce Event Topic</label>
                                    <select value={newEvent} onChange={e => setNewEvent(e.target.value)} className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900">
                                        <option value="order.created">Order Created</option>
                                        <option value="order.updated">Order Updated</option>
                                        <option value="customer.created">Customer Created</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-zinc-700 block mb-1.5">Send Template</label>
                                    <select value={newTemplate} onChange={e => handleTemplateSelectionForTrigger(e.target.value)} className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900">
                                        <option value="">-- Select Template --</option>
                                        {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                    </select>
                                </div>

                                {Object.keys(newMappings).length > 0 && (
                                    <div className="bg-white p-4 rounded-lg border border-zinc-200 space-y-3">
                                        <div className="flex items-center gap-2 mb-2 text-amber-600 bg-amber-50 p-2 rounded text-xs font-medium">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            Map variables to JSON paths. e.g. 'billing.first_name' or 'status'
                                        </div>
                                        {Object.keys(newMappings).map(varId => (
                                            <div key={varId}>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">{varId}</label>
                                                <input
                                                    type="text"
                                                    placeholder="billing.first_name"
                                                    value={newMappings[varId]}
                                                    onChange={e => setNewMappings(prev => ({ ...prev, [varId]: e.target.value }))}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button onClick={handleAddTrigger} disabled={!newTemplate || Object.keys(newMappings).some(k => !newMappings[k])} className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                    Save Rules
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {triggers.length === 0 ? (
                                    <div className="text-center py-8 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                                        <p className="text-sm text-zinc-500">No message triggers mapped yet.</p>
                                    </div>
                                ) : (
                                    triggers.map((trigger, idx) => (
                                        <div key={idx} className="bg-white border border-zinc-200 rounded-xl p-4 flex items-start justify-between group">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                        {trigger.event}
                                                    </span>
                                                </div>
                                                <div className="text-zinc-600 text-sm flex items-center gap-2">
                                                    Sends: <span className="font-semibold text-zinc-900">{trigger.templateName}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemoveTrigger(idx)} className="text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Automated Message Logs */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2.5 rounded-xl">
                            <Activity className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-zinc-900">Automated Message Logs</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Recent messages triggered by WooCommerce events</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {processResult && (
                            <span className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg">{processResult}</span>
                        )}
                        <button
                            onClick={handleProcessNow}
                            disabled={processing}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-70 shadow-sm"
                        >
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Process Now
                        </button>
                        <button onClick={fetchLogs} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors" title="Refresh">
                            <RefreshCw className={`w-4 h-4 text-zinc-400 ${logsLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-zinc-100">
                    {logsLoading ? (
                        <div className="flex items-center justify-center py-10 gap-3 text-zinc-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Loading logs...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Activity className="w-6 h-6 text-zinc-400" />
                            </div>
                            <p className="text-sm font-medium text-zinc-500">No automated messages yet</p>
                            <p className="text-xs text-zinc-400 mt-1">Messages will appear here when WooCommerce triggers fire</p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log._id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'sent' ? 'bg-emerald-500' :
                                            log.status === 'failed' ? 'bg-red-500' : 'bg-amber-400'
                                        }`} />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Phone className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span className="text-sm font-semibold text-zinc-900">+{log.phone}</span>
                                            <span className="text-xs text-zinc-400">·</span>
                                            <span className="text-xs text-zinc-500 font-mono">{log.templateName}</span>
                                        </div>
                                        {log.errorMessage && (
                                            <p className="text-xs text-red-500 truncate">{log.errorMessage}</p>
                                        )}
                                        {log.messageId && (
                                            <p className="text-xs text-zinc-400 font-mono truncate">ID: {log.messageId}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${log.status === 'sent' ? 'bg-emerald-50 text-emerald-700' :
                                            log.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                        }`}>{log.status}</span>
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
