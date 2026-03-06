"use client";

import { useState } from "react";
import { PhoneCall, Loader2, CheckCircle2 } from "lucide-react";
import { useSession, SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";

function RequestCallButtonInner({ educatorId }: { educatorId: string }) {
    const { data: session } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleRequestCall = async () => {
        if (!session) {
            router.push("/login");
            return;
        }

        if ((session.user as any)?.role !== "student") {
            setStatus("error");
            setMessage("Only students can request calls.");
            return;
        }

        setIsLoading(true);
        setStatus("idle");
        setMessage("");

        try {
            const res = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ educatorId }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus("success");
                setMessage("Request sent!");
            } else {
                setStatus("error");
                setMessage(data.error || "Failed to send request.");
            }
        } catch (error) {
            setStatus("error");
            setMessage("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "success") {
        return (
            <button disabled className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-7 py-2.5 rounded-xl font-medium shadow-sm border border-emerald-200 cursor-default">
                <CheckCircle2 className="w-4 h-4" />
                {message}
            </button>
        );
    }

    return (
        <div className="relative flex-1 md:flex-none">
            <button
                onClick={handleRequestCall}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-white text-zinc-900 px-7 py-2.5 rounded-xl font-medium hover:bg-zinc-50 transition-all duration-200 shadow-sm border border-zinc-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                ) : (
                    <PhoneCall className="w-4 h-4 text-zinc-500" />
                )}
                Request Call
            </button>
            {status === "error" && (
                <p className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-max text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded-md border border-red-100">
                    {message}
                </p>
            )}
        </div>
    );
}

export default function RequestCallButton({ educatorId }: { educatorId: string }) {
    return (
        <SessionProvider>
            <RequestCallButtonInner educatorId={educatorId} />
        </SessionProvider>
    );
}
