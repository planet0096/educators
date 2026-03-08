"use client";

import { motion } from "framer-motion";
import { Target, Users, ShieldCheck } from "lucide-react";

export default function EducatorValueProp() {
    return (
        <section className="py-24 bg-zinc-50">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6">
                        Built for Modern Educators
                    </h2>
                    <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
                        We've entirely redesigned the marketplace model so you can focus completely on teaching, not marketing.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: Target,
                            title: "Pay Per Lead",
                            desc: "Stop paying for useless monthly subscriptions. Only pay a flat $5 fee when a highly qualified student explicitly requests to speak with you.",
                            color: "bg-emerald-100 text-emerald-600 border-emerald-200"
                        },
                        {
                            icon: Users,
                            title: "Ads Managed by Experts",
                            desc: "Don't know how to run Facebook or Google ads? We do. Our industry experts run targeted campaigns daily to drive verified traffic right to your profile.",
                            color: "bg-blue-100 text-blue-600 border-blue-200"
                        },
                        {
                            icon: ShieldCheck,
                            title: "0% Uncertainty in Results",
                            desc: "No guessing games. Track your dashboard transparently. See exactly how many students viewed your profile, watched your video, and signed up.",
                            color: "bg-indigo-100 text-indigo-600 border-indigo-200"
                        }
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial="initial"
                            whileInView="animate"
                            viewport={{ once: true }}
                            variants={{
                                initial: { opacity: 0, y: 20 },
                                animate: { opacity: 1, y: 0, transition: { delay: idx * 0.1, duration: 0.5 } }
                            }}
                            className="bg-white p-8 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className={`w-14 h-14 rounded-2xl ${feature.color} border flex items-center justify-center mb-6`}>
                                <feature.icon className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 mb-3">{feature.title}</h3>
                            <p className="text-zinc-600 leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
