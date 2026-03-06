'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Zap, Crown } from "lucide-react";

const plans = [
    {
        id: "starter",
        name: "Starter",
        price: 299,
        icon: Zap,
        features: [
            "Includes ~60 Leads ($5/lead)",
            "Basic Profile Visibility",
            "Email Support",
        ],
        color: "text-blue-500",
        bg: "bg-blue-500",
        ring: "ring-blue-500",
        lightBg: "bg-blue-50",
    },
    {
        id: "growth",
        name: "Growth",
        price: 499,
        icon: Sparkles,
        popular: true,
        features: [
            "Includes ~100 Leads ($5/lead)",
            "Priority Search Ranking",
            "Priority Email Support",
            "Profile Optimization Badge",
        ],
        color: "text-emerald-500",
        bg: "bg-emerald-500",
        ring: "ring-emerald-500",
        lightBg: "bg-emerald-50",
    },
    {
        id: "unlimited",
        name: "Unlimited",
        price: 899,
        icon: Crown,
        features: [
            "Includes ~180 Leads ($5/lead)",
            "Top Search Placement",
            "Dedicated Account Manager",
            "24/7 Phone & Email Support",
            "Featured Educator Badge",
        ],
        color: "text-indigo-500",
        bg: "bg-indigo-500",
        ring: "ring-indigo-500",
        lightBg: "bg-indigo-50",
    }
];

export default function PlansPage() {
    const router = useRouter();
    const [isRecharging, setIsRecharging] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleRecharge = async (planId: string) => {
        setIsRecharging(planId);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/wallet/recharge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to recharge wallet.");
            }

            setSuccess(`Successfully recharged for plan: ${plans.find(p => p.id === planId)?.name}`);

            // Refresh the server state (which hopefully updates layout/balance if fetched on server side)
            router.refresh();

        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsRecharging(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 mb-4">
                    Supercharge your reach.
                </h1>
                <p className="text-lg md:text-xl text-zinc-500 font-medium max-w-2xl mx-auto">
                    Invest in your teaching business. Get your profile in front of motivated students and unlock direct phone requests for just <strong className="text-zinc-900">$5 per lead</strong>.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 border border-red-100 rounded-2xl p-4 text-center font-medium mb-8 max-w-xl mx-auto">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl p-4 text-center font-medium mb-8 max-w-xl mx-auto flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => {
                    const Icon = plan.icon;
                    return (
                        <div
                            key={plan.id}
                            className={`relative bg-white rounded-3xl p-8 border flex flex-col h-full transition-all duration-300 ${plan.popular ? `border-emerald-200 shadow-xl shadow-emerald-900/5 ring-1 ${plan.ring}` : "border-zinc-200/80 shadow-sm hover:shadow-md"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${plan.lightBg}`}>
                                    <Icon className={`w-6 h-6 ${plan.color}`} />
                                </div>
                                <h3 className="text-2xl font-bold text-zinc-900 mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-zinc-900">${plan.price}</span>
                                    <span className="text-zinc-500 font-medium">/ recharge</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-10 flex-1">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center">
                                            <Check className="w-3.5 h-3.5 text-zinc-900" />
                                        </div>
                                        <span className="text-zinc-600 text-sm font-medium leading-tight pt-0.5">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleRecharge(plan.id)}
                                disabled={isRecharging !== null}
                                className={`w-full py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all focus:outline-none focus:ring-[3px] ${plan.popular
                                        ? "bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500/30 shadow-sm"
                                        : "bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-zinc-900/30 shadow-sm"
                                    } ${isRecharging !== null && isRecharging !== plan.id ? "opacity-50 grayscale" : ""} ${isRecharging === plan.id ? "opacity-80" : ""}`}
                            >
                                {isRecharging === plan.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                                    </span>
                                ) : (
                                    `Select ${plan.name}`
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-16 text-center text-sm font-medium text-zinc-500">
                <p>Transactions are secure. Wallet credits never expire. Deductions only happen for unique leads.</p>
            </div>
        </div>
    );
}
