"use client";

import { useState, useEffect, FormEvent } from "react";
import { Calendar, Plus, Loader2, Play, Pause, Edit, Trash2, Zap, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const TRIGGER_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    calcom_booking_created: { label: "Booking Created", icon: "📅", color: "text-blue-700 bg-blue-50 border-blue-200" },
    calcom_booking_cancelled: { label: "Booking Cancelled", icon: "❌", color: "text-red-700 bg-red-50 border-red-200" },
    calcom_booking_rescheduled: { label: "Booking Rescheduled", icon: "🔄", color: "text-amber-700 bg-amber-50 border-amber-200" },
    calcom_reminder: { label: "Meeting Reminder", icon: "⏰", color: "text-purple-700 bg-purple-50 border-purple-200" },
};

export default function CalcomAutomationsPage() {
    const [tab, setTab] = useState<"workflows" | "logs" | "troubleshoot">("workflows");
    const [flows, setFlows] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [troubleshootLogs, setTroubleshootLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(false);
    const [troubleshootLoading, setTroubleshootLoading] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newFlowName, setNewFlowName] = useState("");
    const [newFlowTrigger, setNewFlowTrigger] = useState("calcom_booking_created");
    const [newFlowDescription, setNewFlowDescription] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => { fetchFlows(); }, []);
    useEffect(() => { if (tab === "logs" && logs.length === 0) fetchLogs(); }, [tab]);
    useEffect(() => { if (tab === "troubleshoot" && troubleshootLogs.length === 0) fetchTroubleshoot(); }, [tab]);

    const fetchFlows = async () => {
        try {
            const res = await fetch("/api/automation/flows?source=calcom");
            const data = await res.json();
            if (data.success) setFlows(data.flows);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await fetch("/api/calcom/logs");
            const data = await res.json();
            if (data.success) setLogs(data.logs);
        } finally {
            setLogsLoading(false);
        }
    };

    const fetchTroubleshoot = async () => {
        setTroubleshootLoading(true);
        try {
            const res = await fetch("/api/calcom/troubleshoot");
            const data = await res.json();
            if (data.success) setTroubleshootLogs(data.logs);
        } finally {
            setTroubleshootLoading(false);
        }
    };

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch("/api/automation/flows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newFlowName,
                    description: newFlowDescription,
                    source: "calcom",
                    triggerType: newFlowTrigger,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Workflow created!");
                setFlows([data.flow, ...flows]);
                setIsCreateModalOpen(false);
                setNewFlowName("");
                setNewFlowDescription("");
            } else {
                toast.error(data.error || "Failed to create");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setCreating(false);
        }
    };

    const toggleStatus = async (id: string, current: boolean) => {
        const res = await fetch(`/api/automation/flows/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !current }),
        });
        const data = await res.json();
        if (data.success) {
            setFlows(flows.map(f => f._id === id ? { ...f, isActive: !current } : f));
            toast.success(`Workflow ${!current ? "activated" : "paused"}`);
        }
    };

    const deleteFlow = async (id: string) => {
        if (!confirm("Delete this workflow permanently?")) return;
        const res = await fetch(`/api/automation/flows/${id}`, { method: "DELETE" });
        if (res.ok) {
            setFlows(flows.filter(f => f._id !== id));
            toast.success("Workflow deleted");
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-blue-600" />
                        Cal.com Workflows
                    </h1>
                    <p className="text-zinc-500 mt-1.5 text-sm">
                        Build automated WhatsApp sequences triggered by Cal.com booking events.
                    </p>
                </div>
                {tab === "workflows" && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        New Workflow
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200">
                {(["workflows", "logs", "troubleshoot"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-5 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
                        {t === "workflows" && "⚡ Workflows"}
                        {t === "logs" && "📋 Execution History"}
                        {t === "troubleshoot" && "🛠️ Troubleshoot Webhooks"}
                    </button>
                ))}
            </div>

            {/* ===== WORKFLOWS TAB ===== */}
            {tab === "workflows" && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-600" /> How Cal.com Workflows Work
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { step: "1", title: "Cal.com fires a webhook", desc: "When a student books, reschedules, or cancels a meeting on your Cal.com page." },
                                { step: "2", title: "We match the trigger", desc: "Your active workflows that match the event type (e.g. Booking Created) are instantly activated." },
                                { step: "3", title: "WhatsApp messages fire", desc: "Messages with dynamic variables like name, date, and joining link are sent automatically." },
                            ].map(item => (
                                <div key={item.step} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">{item.step}</div>
                                    <div>
                                        <div className="text-sm font-semibold text-blue-900">{item.title}</div>
                                        <div className="text-xs text-blue-700 mt-0.5">{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {flows.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-zinc-200 rounded-2xl border-dashed">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                <Calendar className="w-8 h-8 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-900 mb-2">No Workflows Yet</h3>
                            <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
                                Create your first Cal.com automation to start sending triggered WhatsApp messages.
                            </p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center mx-auto gap-2"
                            >
                                <Plus className="w-4 h-4" /> Create First Workflow
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {flows.map(flow => {
                                const trigger = TRIGGER_LABELS[flow.triggerType] || { label: flow.triggerType, icon: "⚡", color: "text-zinc-600 bg-zinc-50 border-zinc-200" };
                                return (
                                    <div key={flow._id} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:border-blue-300 transition-colors group">
                                        <div className="p-5 flex-1 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${flow.isActive ? "bg-emerald-500" : "bg-zinc-300"}`} />
                                                    <span className={`text-xs font-semibold uppercase tracking-wider ${flow.isActive ? "text-emerald-700" : "text-zinc-500"}`}>
                                                        {flow.isActive ? "Active" : "Paused"}
                                                    </span>
                                                </div>
                                                <button onClick={() => deleteFlow(flow._id)} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-bold text-zinc-900 line-clamp-1">{flow.name}</h3>
                                                <p className="text-sm text-zinc-500 mt-1 line-clamp-2 min-h-[40px]">
                                                    {flow.description || "No description."}
                                                </p>
                                            </div>

                                            <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border ${trigger.color}`}>
                                                <span>{trigger.icon}</span>
                                                {trigger.label}
                                            </div>
                                        </div>

                                        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
                                            <button
                                                onClick={() => toggleStatus(flow._id, flow.isActive)}
                                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${flow.isActive
                                                    ? "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                                                    : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                                    }`}
                                            >
                                                {flow.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                {flow.isActive ? "Pause" : "Activate"}
                                            </button>
                                            <Link
                                                href={`/dashboard/calcom-automations/${flow._id}`}
                                                className="flex-1 bg-zinc-900 text-white flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
                                            >
                                                <Edit className="w-4 h-4" />
                                                Builder
                                            </Link>
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
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                            <th className="px-4 py-3 text-left">Status</th>
                                            <th className="px-4 py-3 text-left">Workflow / Node</th>
                                            <th className="px-4 py-3 text-left">Invitee</th>
                                            <th className="px-4 py-3 text-left">Action</th>
                                            <th className="px-4 py-3 text-left">Trigger</th>
                                            <th className="px-4 py-3 text-left">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {logs.map(log => (
                                            <tr key={log._id} className="hover:bg-zinc-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    {log.status === "success"
                                                        ? <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs"><CheckCircle2 className="w-4 h-4" /> Success</span>
                                                        : <span className="flex items-center gap-1.5 text-red-500 font-semibold text-xs" title={log.errorMessage}><XCircle className="w-4 h-4" /> Failed ({log.errorMessage})</span>
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
                            </div>
                            {logs.some(l => l.status === "failed") && (
                                <div className="px-4 py-3 bg-rose-50 border-t border-rose-100 text-xs text-rose-600">
                                    <strong>Failed rows:</strong> Hover over the ❌ icon to see the actual error message mapping variables or formatting phones.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ===== TROUBLESHOOT TAB ===== */}
            {tab === "troubleshoot" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900">Raw Webhook Logs</h3>
                            <p className="text-sm text-zinc-500">See exactly what Cal.com is sending to your server to debug missing phone numbers or ignored events.</p>
                        </div>
                        <button onClick={fetchTroubleshoot} disabled={troubleshootLoading} className="flex items-center gap-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-4 py-2 rounded-lg font-medium transition-colors">
                            <RefreshCw className={`w-4 h-4 ${troubleshootLoading ? "animate-spin" : ""}`} /> Refresh
                        </button>
                    </div>

                    {troubleshootLoading ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
                    ) : troubleshootLogs.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-zinc-200 border-dashed rounded-2xl">
                            <span className="text-4xl mb-3 block">🛠️</span>
                            <h3 className="font-semibold text-zinc-600 mb-1">No webhooks received yet</h3>
                            <p className="text-sm text-zinc-400">Make test bookings on your connected Cal.com account and refresh here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {troubleshootLogs.map((log) => (
                                <div key={log._id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs font-bold bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded">{log.triggerEvent}</span>
                                            <span className="text-xs text-zinc-500">{new Date(log.receivedAt).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {log.processed ? (
                                                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Processed</span>
                                            ) : (
                                                <span className="text-xs font-medium text-rose-500 flex items-center gap-1" title={log.errorReason}><XCircle className="w-3.5 h-3.5" /> Skipped / Ignored</span>
                                            )}
                                        </div>
                                    </div>
                                    {log.errorReason && (
                                        <div className="bg-rose-50 px-4 py-2 text-xs text-rose-700 border-b border-rose-100">
                                            <strong>Reason for skipping:</strong> {log.errorReason}
                                        </div>
                                    )}
                                    <div className="p-4 overflow-x-auto max-h-96">
                                        <pre className="text-[11px] font-mono text-zinc-700">{JSON.stringify(log.payload, null, 2)}</pre>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900">Create Cal.com Workflow</h3>
                                <p className="text-sm text-zinc-500 mt-1">Choose what event triggers this action.</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:bg-zinc-100 p-2 rounded-lg">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-zinc-900 block mb-1.5">Workflow Name</label>
                                <input
                                    type="text" required value={newFlowName}
                                    onChange={e => setNewFlowName(e.target.value)}
                                    placeholder="e.g. Booking Confirmation"
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-zinc-900 block mb-1.5">Trigger Event</label>
                                <select
                                    value={newFlowTrigger} onChange={e => setNewFlowTrigger(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                >
                                    <option value="calcom_booking_created">📅 Booking Created</option>
                                    <option value="calcom_booking_cancelled">❌ Booking Cancelled</option>
                                    <option value="calcom_booking_rescheduled">🔄 Booking Rescheduled</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-zinc-900 block mb-1.5">Notes (Optional)</label>
                                <textarea
                                    value={newFlowDescription} onChange={e => setNewFlowDescription(e.target.value)}
                                    placeholder="What does this do?"
                                    rows={2}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                />
                            </div>
                            <div className="pt-2 flex items-center gap-3 justify-end">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm text-zinc-600 hover:bg-zinc-100 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit" disabled={creating || !newFlowName}
                                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                                >
                                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Workflow
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
