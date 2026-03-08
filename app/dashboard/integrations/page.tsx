"use client";

import { useEffect, useState } from "react";
import { Link2, CheckCircle2, AlertCircle, Loader2, Key, ExternalLink, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function IntegrationsPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [username, setUsername] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [apiKey, setApiKey] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        checkStatus();
    }, []);

    async function checkStatus() {
        try {
            setIsLoading(true);
            const res = await fetch("/api/calcom/auth-status");
            if (res.ok) {
                const data = await res.json();
                if (data.connected) {
                    setIsConnected(true);
                    setUsername(data.username);
                }
            }
        } catch (error) {
            console.error("Failed to fetch Cal.com auth status", error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleConnect() {
        if (!apiKey.trim()) {
            setMessage({ type: "error", text: "Please enter your Cal.com API key." });
            return;
        }
        setIsSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/calcom/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey: apiKey.trim() }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setIsConnected(true);
                setUsername(data.username);
                setApiKey("");
                setMessage({ type: "success", text: `Successfully connected as @${data.username}!` });
            } else {
                setMessage({ type: "error", text: data.error || "Failed to connect. Check your API key." });
            }
        } catch {
            setMessage({ type: "error", text: "Network error. Please try again." });
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDisconnect() {
        setIsDisconnecting(true);
        setMessage(null);
        try {
            const res = await fetch("/api/calcom/connect", { method: "DELETE" });
            if (res.ok) {
                setIsConnected(false);
                setUsername("");
                setMessage({ type: "success", text: "Cal.com disconnected successfully." });
            }
        } catch {
            setMessage({ type: "error", text: "Failed to disconnect. Please try again." });
        } finally {
            setIsDisconnecting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Integrations</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Connect third-party tools to automate your workflows.
                </p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border ${message.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}>
                    {message.type === "success"
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Cal.com Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow col-span-1 md:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center shadow-inner shrink-0 text-white font-bold text-xl">
                            C
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-900 leading-tight">Cal.com</h2>
                            <p className="text-xs text-zinc-500 font-medium">Scheduling & Automation</p>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-zinc-600 leading-relaxed">
                        Allow students to book meetings directly with you. Sends automated WhatsApp confirmations instantly upon booking.
                    </div>

                    <div className="mt-6">
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                                <Loader2 className="w-4 h-4 animate-spin" /> Fetching status...
                            </div>
                        ) : isConnected ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    Connected as @{username}
                                </div>
                                <button
                                    onClick={handleDisconnect}
                                    disabled={isDisconnecting}
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-rose-600 border border-rose-200 hover:bg-rose-50 font-semibold text-sm transition-all disabled:opacity-50"
                                >
                                    {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                                        Cal.com API Key
                                        <a
                                            href="https://app.cal.com/settings/developer/api-keys"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-0.5 font-normal"
                                        >
                                            Get it here <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                                            placeholder="cal_live_xxxxxxxxxxxxxxxxxxxx"
                                            className="w-full border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleConnect}
                                    disabled={isSaving}
                                    className="w-full flex items-center justify-center py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm shadow-md transition-all gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                                    {isSaving ? "Connecting..." : "Connect Account"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
