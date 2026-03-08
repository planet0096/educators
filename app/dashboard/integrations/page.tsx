"use client";

import { useEffect, useState } from "react";
import { Link2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function IntegrationsPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [username, setUsername] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const searchParams = useSearchParams();

    const successParams = searchParams.get("calcom_success");
    const errorParams = searchParams.get("error");

    useEffect(() => {
        async function checkStatus() {
            try {
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
        checkStatus();
    }, []);

    const handleConnectClick = () => {
        window.location.href = "/api/calcom/authorize";
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Integrations</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Connect third-party tools to automate your workflows.
                </p>
            </div>

            {successParams && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm font-medium">Successfully connected to Cal.com!</p>
                </div>
            )}

            {errorParams && (
                <div className="bg-rose-50 text-rose-800 border border-rose-200 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <p className="text-sm font-medium">
                        {errorParams === "calcom_auth_failed"
                            ? "Authentication failed. Please try again."
                            : "An error occurred during the integration process."}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Cal.com Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center shadow-inner shrink-0 text-white font-bold text-xl">
                                C
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-zinc-900 leading-tight">Cal.com</h2>
                                <p className="text-xs text-zinc-500 font-medium">Scheduling & Automation</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-zinc-600 leading-relaxed">
                        Allow students to book meetings directly with you. Sends automated WhatsApp confirmations to your students instantly.
                    </div>

                    <div className="mt-6">
                        {isLoading ? (
                            <button disabled className="w-full flex items-center justify-center py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-400 font-semibold text-sm transition-all gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Fetching Status
                            </button>
                        ) : isConnected ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Connected as @{username}
                                </div>
                                <button
                                    onClick={handleConnectClick} // Optionally create a disconnect route later
                                    className="w-full flex items-center justify-center py-2 rounded-xl text-zinc-600 border border-zinc-200 hover:bg-zinc-50 font-semibold text-sm transition-all"
                                >
                                    Reconnect
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleConnectClick}
                                className="w-full flex items-center justify-center py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm shadow-md transition-all gap-2"
                            >
                                <Link2 className="w-4 h-4" />
                                Connect Account
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
