"use client";

import { useState, useEffect, FormEvent } from "react";
import { Bot, Plus, Loader2, Play, Pause, MoreVertical, Edit, Trash2, Settings2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AutomationDashboardPage() {
    const [flows, setFlows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newFlowName, setNewFlowName] = useState("");
    const [newFlowDescription, setNewFlowDescription] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchFlows();
    }, []);

    const fetchFlows = async () => {
        try {
            const res = await fetch("/api/automation/flows");
            const data = await res.json();
            if (data.success) {
                setFlows(data.flows);
            }
        } catch (error) {
            console.error("Error fetching flows", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFlow = async (e: FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            const res = await fetch("/api/automation/flows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newFlowName, description: newFlowDescription })
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Flow created successfully");
                setFlows([data.flow, ...flows]);
                setIsCreateModalOpen(false);
                setNewFlowName("");
                setNewFlowDescription("");
            } else {
                toast.error(data.error || "Failed to create flow");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setCreating(false);
        }
    };

    const toggleFlowStatus = async (id: string, currentStatus: boolean) => {
        // Optimistic UI update could go here
        try {
            const res = await fetch(`/api/automation/flows/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus })
            });

            const data = await res.json();
            if (data.success) {
                setFlows(flows.map(f => f._id === id ? { ...f, isActive: !currentStatus } : f));
                toast.success(`Flow ${!currentStatus ? 'activated' : 'deactivated'}`);
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
                        <Bot className="w-8 h-8 text-indigo-600" />
                        Chatbot Automations
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Build powerful automated conversational flows to engage leads and students 24/7.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 w-full md:w-auto justify-center"
                >
                    <Plus className="w-4 h-4" />
                    Create New Flow
                </button>
            </div>

            {/* Flows Grid */}
            {flows.length === 0 ? (
                <div className="text-center py-16 bg-white border border-zinc-200 rounded-2xl border-dashed">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                        <Settings2 className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">No Automations Yet</h3>
                    <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
                        Create AI-guided chatbot flows to automate your WhatsApp responses flawlessly.
                    </p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-zinc-900 text-white hover:bg-zinc-800 font-medium px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center mx-auto gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Build First Flow
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {flows.map((flow) => (
                        <div key={flow._id} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:border-indigo-300 transition-colors group">
                            <div className="p-5 flex-1 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${flow.isActive ? 'bg-emerald-500' : 'bg-zinc-300'}`}></div>
                                        <span className={`text-xs font-semibold uppercase tracking-wider ${flow.isActive ? 'text-emerald-700' : 'text-zinc-500'}`}>
                                            {flow.isActive ? "Active" : "Draft"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-zinc-400 hover:text-zinc-700">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-zinc-900 line-clamp-1">{flow.name}</h3>
                                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2 min-h-[40px]">
                                        {flow.description || "No description provided."}
                                    </p>
                                </div>

                                <div className="text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                                    <span className="font-medium text-zinc-700">Trigger:</span> {
                                        flow.triggerType === "keyword" ? "Keyword Match" :
                                            flow.triggerType === "first_contact" ? "First Contact" : "Catch All"
                                    }
                                </div>
                            </div>

                            <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-3">
                                <button
                                    onClick={() => toggleFlowStatus(flow._id, flow.isActive)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${flow.isActive
                                        ? "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                                        : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                        }`}
                                >
                                    {flow.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    {flow.isActive ? "Pause" : "Activate"}
                                </button>

                                <Link
                                    href={`/dashboard/automation/${flow._id}`}
                                    className="flex-1 bg-zinc-900 border border-transparent text-white flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
                                >
                                    <Edit className="w-4 h-4" />
                                    Builder
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-zinc-900">Create New Flow</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-zinc-400 hover:text-zinc-700"
                            >
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateFlow} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900 block">Flow Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newFlowName}
                                    onChange={(e) => setNewFlowName(e.target.value)}
                                    placeholder="e.g. Lead Qualification Bot"
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900 block">Description (Optional)</label>
                                <textarea
                                    value={newFlowDescription}
                                    onChange={(e) => setNewFlowDescription(e.target.value)}
                                    placeholder="What does this automation do?"
                                    rows={3}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm resize-none"
                                />
                            </div>

                            <div className="pt-4 flex items-center gap-3 w-full justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl font-medium text-sm text-zinc-600 hover:bg-zinc-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating || !newFlowName}
                                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                                >
                                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Flow
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
