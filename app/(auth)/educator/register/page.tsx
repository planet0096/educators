"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2, ArrowRight, Briefcase } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function EducatorRegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role: "educator" }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong.");
            } else {
                // Log the user in immediately after successful registration
                const signInResult = await signIn("credentials", {
                    redirect: false,
                    email,
                    password,
                });

                if (signInResult?.error) {
                    setError("Registration successful, but auto-login failed. Please sign in.");
                    return;
                }

                // Check if they need onboarding
                try {
                    const statusRes = await fetch("/api/auth/status");
                    const statusData = await statusRes.json();

                    if (statusData.hasProfile) {
                        router.push("/dashboard");
                    } else {
                        router.push("/onboarding");
                    }
                } catch {
                    // Fallback to onboarding if status check fails
                    router.push("/onboarding");
                }
                router.refresh();
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-white">
            {/* Left Marketing Panel */}
            <div className="hidden lg:flex w-1/2 relative bg-zinc-900 overflow-hidden items-end p-16">
                <Image
                    src="/images/marketing_educator.png"
                    alt="Educator Abstract Background"
                    fill
                    className="object-cover opacity-60 scale-105"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

                <div className="relative z-10 w-full max-w-lg mb-12">
                    <div className="inline-flex items-center justify-center p-3.5 bg-white/10 backdrop-blur-md rounded-2xl mb-6 border border-white/20">
                        <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
                        Start Getting Students.
                    </h1>
                    <p className="text-xl text-zinc-300 font-medium">
                        The #1 Leads solutions for top-rated educators. Scale your teaching business with a continuous stream of verified students.
                    </p>
                </div>
            </div>

            {/* Right Form Panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
                {/* Mobile Background */}
                <div className="absolute inset-0 lg:hidden">
                    <div className="absolute inset-0 bg-zinc-50" />
                    <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/50 blur-[120px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-md relative z-10"
                >
                    <Link href="/register" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 mb-8 transition-colors">
                        <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                        Back to options
                    </Link>

                    <div className="mb-10">
                        <div className="inline-flex items-center justify-center h-12 w-12 bg-zinc-900 lg:bg-emerald-500 text-white rounded-xl shadow-md mb-6">
                            <span className="font-semibold text-2xl tracking-tighter">E</span>
                        </div>
                        <h2 className="text-3xl font-bold text-zinc-900 mb-2 tracking-tight">Apply as Educator</h2>
                        <p className="text-zinc-500">Create your profile to start receiving leads.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-700 ml-1">Work Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all duration-200"
                                    placeholder="name@school.edu"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-700 ml-1">Create Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all duration-200"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <p className="text-xs text-zinc-500 ml-1 mt-1">Must be at least 6 characters long.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-zinc-900 hover:bg-zinc-800 lg:bg-emerald-600 lg:hover:bg-emerald-700 text-white rounded-xl py-3.5 px-4 font-semibold focus:outline-none focus:ring-[3px] focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center group mt-8 shadow-sm shadow-emerald-900/10"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin text-white/70" />
                            ) : (
                                <>
                                    Complete Creation
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-zinc-500">
                        Already have an educator account?{" "}
                        <Link href="/educator/login" className="text-zinc-900 lg:text-emerald-600 font-bold hover:underline decoration-emerald-300 underline-offset-4 transition-all">
                            Sign in here
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
