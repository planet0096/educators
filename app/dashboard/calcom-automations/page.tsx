"use client";

import { useState, useEffect } from "react";
import {
    Calendar, Plus, Loader2, Play, Pause, Trash2, CheckCircle2,
    XCircle, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Zap
} from "lucide-react";
import toast from "react-hot-toast";

const TRIGGERS = [
    { value: "calcom_booking_created", label: "📅 Booking Created", desc: "Fires when a student books a meeting" },
    { value: "calcom_booking_cancelled", label: "❌ Booking Cancelled", desc: "Fires when a booking is cancelled" },
    { value: "calcom_booking_rescheduled", label: "🔄 Booking Rescheduled", desc: "Fires when a booking is rescheduled" },
];

const CALCOM_VARS = [
    { value: "{{invitee_name}}", label: "Invitee Name" },
    { value: "{{invitee_phone}}", label: "Invitee Phone" },
    { value: "{{invitee_email}}", label: "Invitee Email" },
    { value: "{{meeting_date}}", label: "Meeting Date & Time" },
    { value: "{{meeting_link}}", label: "Meeting Link / Location" },
    { value: "{{organizer_name}}", label: "Organizer (Your) Name" },
    { value: "{{event_type}}", label: "Event Type Name" },
];

interface Template {
    name: string;
    language: string;
    bodyText: string;
    variableCount: number;
}

interface Rule {
    _id: string;
    name: string;
    triggerType: string;
    isActive: boolean;
    templateName: string;
    languageCode: string;
    variableMappings: { param: string; variable: string }[];
    createdAt: string;
}

interface Log {
    _id: string;
    ruleName: string;
    triggerEvent: string;
    inviteeName: string;
    inviteePhone: string;
    templateName: string;
    status: "success" | "failed";
    errorMessage?: string;
    executedAt: string;
}

export default function CalcomAutomationsPage() {
    const [tab, setTab] = useState<"rules" | "logs">("rules");
    const [rules, setRules] = useState<Rule[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [templatesError, setTemplatesError] = useState("");
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(false);
    const [showNewRule, setShowNewRule] = useState(false);

    // New rule form state
    const [newName, setNewName] = useState("");
    const [newTrigger, setNewTrigger] = useState("calcom_booking_created");
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [variableMappings, setVariableMappings] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchRules();
        fetchTemplates();
    }, []);

    useEffect(() => {
        if (tab === "logs" && logs.length === 0) fetchLogs();
    }, [tab]);

    // When template changes, reset and initialise variable mapping slots
    useEffect(() => {
        if (selectedTemplate) {
            setVariableMappings(Array(selectedTemplate.variableCount).fill(""));
        } else {
            setVariableMappings([]);
        }
    }, [selectedTemplate]);

    async function fetchRules() {
        try {
            const res = await fetch("/api/calcom/rules");
            const data = await res.json();
            if (data.success) setRules(data.rules);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTemplates() {
        const res = await fetch("/api/calcom/templates");
        const data = await res.json();
        if (data.success) {
            setTemplates(data.templates);
        } else {
            setTemplatesError(data.error || "Could not load templates");
        }
    }

    async function fetchLogs() {
        setLogsLoading(true);
        try {
            const res = await fetch("/api/calcom/logs");
            const data = await res.json();
            if (data.success) setLogs(data.logs);
        } finally {
            setLogsLoading(false);
        }
    }

    async function handleCreateRule() {
        if (!newName || !selectedTemplate) {
            toast.error("Please fill in all fields.");
            return;
        }
        setCreating(true);
        try {
            const mappings = variableMappings.map((v, i) => ({
                param: `{{${i + 1}}}`,
                variable: v,
            }));
            const res = await fetch("/api/calcom/rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    triggerType: newTrigger,
                    templateName: selectedTemplate.name,
                    languageCode: selectedTemplate.language,
                    variableMappings: mappings,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Rule created and activated!");
                setRules([data.rule, ...rules]);
                setShowNewRule(false);
                setNewName("");
                setSelectedTemplate(null);
                setVariableMappings([]);
            } else {
                toast.error(data.error || "Failed to create rule");
            }
        } catch {
            toast.error("Error creating rule");
        } finally {
            setCreating(false);
        }
    }

    async function toggleRule(id: string, current: boolean) {
        const res = await fetch(`/api/calcom/rules/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !current }),
        });
        if (res.ok) {
            setRules(rules.map(r => r._id === id ? { ...r, isActive: !current } : r));
            toast.success(current ? "Paused" : "Activated");
        }
    }

    async function deleteRule(id: string) {
        if (!confirm("Delete this rule permanently?")) return;
        await fetch(`/api/calcom/rules/${id}`, { method: "DELETE" });
        setRules(rules.filter(r => r._id !== id));
        toast.success("Rule deleted");
    }

    const triggerMeta = (t: string) => TRIGGERS.find(x => x.value === t) || { label: t, desc: "" };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2.5">
                        <Calendar className="w-7 h-7 text-blue-600" /> Cal.com Automations
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Send automatic WhatsApp messages when Cal.com booking events happen.
                    </p>
                </div>
                {tab === "rules" && (
                    <button
                        onClick={() => setShowNewRule(!showNewRule)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm w-full md:w-auto justify-center"
                    >
                        {showNewRule ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showNewRule ? "Close" : "New Rule"}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200">
                {(["rules", "logs"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-5 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
                        {t === "rules" ? "⚡ Rules" : "📋 Execution History"}
                    </button>
                ))}
            </div>

            {/* ===== RULES TAB ===== */}
            {tab === "rules" && (
                <div className="space-y-5">
                    {/* New Rule Form */}
                    {showNewRule && (
                        <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 space-y-5 shadow-sm">
                            <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
                                <Zap className="w-4 h-4 text-blue-600" /> Create New Rule
                            </h3>

                            {/* Rule Name */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Rule Name</label>
                                <input
                                    value={newName} onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. Booking Confirmation"
                                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            {/* Trigger */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">When this happens...</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {TRIGGERS.map(t => (
                                        <button key={t.value} onClick={() => setNewTrigger(t.value)}
                                            className={`text-left p-3.5 rounded-xl border-2 transition-all ${newTrigger === t.value ? "border-blue-500 bg-blue-50" : "border-zinc-200 hover:border-zinc-300 bg-white"}`}>
                                            <div className="font-semibold text-sm text-zinc-900">{t.label}</div>
                                            <div className="text-[11px] text-zinc-500 mt-0.5">{t.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Template Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Send this WhatsApp Template...</label>
                                {templatesError ? (
                                    <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {templatesError}
                                    </div>
                                ) : templates.length === 0 ? (
                                    <div className="flex items-center gap-2 text-sm text-zinc-500 p-3 rounded-xl border border-zinc-200">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading approved templates...
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                                        {templates.map(t => (
                                            <button key={t.name} onClick={() => setSelectedTemplate(t === selectedTemplate ? null : t)}
                                                className={`text-left p-3 rounded-xl border-2 transition-all ${selectedTemplate?.name === t.name ? "border-purple-500 bg-purple-50" : "border-zinc-200 hover:border-zinc-300 bg-white"}`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-sm text-zinc-900 font-mono">{t.name}</span>
                                                    {t.variableCount > 0 && (
                                                        <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                                                            {t.variableCount} variable{t.variableCount > 1 ? "s" : ""}
                                                        </span>
                                                    )}
                                                </div>
                                                {t.bodyText && (
                                                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{t.bodyText}</p>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Variable Mapping */}
                            {selectedTemplate && selectedTemplate.variableCount > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Map Template Variables</label>
                                    <p className="text-xs text-zinc-500">Choose what booking data to insert into each {"{{variable}}"} in your template.</p>
                                    <div className="space-y-2">
                                        {Array.from({ length: selectedTemplate.variableCount }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1.5 rounded-lg font-mono shrink-0 w-10 text-center">
                                                    {`{{${i + 1}}}`}
                                                </span>
                                                <select
                                                    value={variableMappings[i] || ""}
                                                    onChange={e => { const m = [...variableMappings]; m[i] = e.target.value; setVariableMappings(m); }}
                                                    className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-zinc-50"
                                                >
                                                    <option value="">— Select booking data —</option>
                                                    {CALCOM_VARS.map(v => (
                                                        <option key={v.value} value={v.value}>{v.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
                                <button onClick={() => setShowNewRule(false)} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateRule}
                                    disabled={creating || !newName || !selectedTemplate}
                                    className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create & Activate Rule
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Rules List */}
                    {loading ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
                    ) : rules.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-zinc-200 border-dashed rounded-2xl">
                            <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-zinc-600 mb-1">No rules yet</h3>
                            <p className="text-sm text-zinc-400">Create a rule above to start sending automated WhatsApp messages.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rules.map(rule => {
                                const trigger = triggerMeta(rule.triggerType);
                                return (
                                    <div key={rule._id} className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm hover:border-zinc-300 transition-colors">
                                        {/* Status dot */}
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 sm:mt-0 ${rule.isActive ? "bg-emerald-500" : "bg-zinc-300"}`} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-zinc-900 text-sm">{rule.name}</span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rule.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                                                    {rule.isActive ? "Active" : "Paused"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-zinc-500">
                                                <span className="flex items-center gap-1">{trigger.label}</span>
                                                <span className="text-zinc-300">→</span>
                                                <span className="font-mono bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded font-semibold">{rule.templateName}</span>
                                                {rule.variableMappings.length > 0 && (
                                                    <span className="text-zinc-400">({rule.variableMappings.length} var{rule.variableMappings.length > 1 ? "s" : ""} mapped)</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => toggleRule(rule._id, rule.isActive)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${rule.isActive
                                                    ? "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                                                    : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>
                                                {rule.isActive ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Activate</>}
                                            </button>
                                            <button onClick={() => deleteRule(rule._id)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ===== LOGS TAB ===== */}
            {tab === "logs" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-500">Last 100 webhook executions</p>
                        <button onClick={fetchLogs} disabled={logsLoading} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
                            <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin" : ""}`} /> Refresh
                        </button>
                    </div>

                    {logsLoading ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-zinc-200 border-dashed rounded-2xl">
                            <span className="text-4xl mb-3 block">📋</span>
                            <h3 className="font-semibold text-zinc-600 mb-1">No logs yet</h3>
                            <p className="text-sm text-zinc-400">Execution history appears here after booking events fire.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Rule</th>
                                        <th className="px-4 py-3 text-left">Invitee</th>
                                        <th className="px-4 py-3 text-left">Template</th>
                                        <th className="px-4 py-3 text-left">Trigger</th>
                                        <th className="px-4 py-3 text-left">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {logs.map(log => (
                                        <tr key={log._id} className="hover:bg-zinc-50 transition-colors">
                                            <td className="px-4 py-3">
                                                {log.status === "success"
                                                    ? <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs"><CheckCircle2 className="w-4 h-4" /> Sent</span>
                                                    : <span className="flex items-center gap-1.5 text-red-500 font-semibold text-xs" title={log.errorMessage}><XCircle className="w-4 h-4" /> Failed</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 font-medium text-zinc-800 max-w-[140px] truncate">{log.ruleName || "—"}</td>
                                            <td className="px-4 py-3 text-zinc-600">
                                                <div className="font-medium">{log.inviteeName}</div>
                                                <div className="text-xs text-zinc-400">{log.inviteePhone}</div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-purple-700 bg-purple-50 rounded px-2 max-w-[120px] truncate">{log.templateName}</td>
                                            <td className="px-4 py-3 text-xs text-zinc-500">{log.triggerEvent?.replace("booking.", "").replace("_", " ") || "—"}</td>
                                            <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                                                {log.executedAt ? new Date(log.executedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {logs.some(l => l.status === "failed") && (
                                <div className="px-4 py-3 bg-rose-50 border-t border-rose-100 text-xs text-rose-600">
                                    <strong>Failed rows:</strong> Hover over the ❌ icon to see the error message.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
