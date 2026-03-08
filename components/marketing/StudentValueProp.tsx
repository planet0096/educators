"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function StudentValueProp() {
    return (
        <section className="py-24 overflow-hidden border-t border-zinc-100">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8 order-2 lg:order-1">
                        <div className="w-full max-w-lg">
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                            >
                                <span className="text-sm font-bold tracking-wider uppercase text-rose-500 mb-3 block">
                                    For Students
                                </span>
                                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6 leading-tight">
                                    Find your perfect <br /> educator today.
                                </h2>
                                <p className="text-lg text-zinc-600 leading-relaxed mb-8">
                                    Browse globally verified experts, compare transparent pricing, and master your subjects. Whether you're preparing for the IELTS, SATs, or just need a math tutor, we've got you covered.
                                </p>

                                <ul className="space-y-5 mb-10">
                                    {["Watch introductory YouTube videos before committing", "Compare programs and precise fee structures", "Request an immediate callback with one click"].map((point, i) => (
                                        <li key={i} className="flex items-start gap-4">
                                            <div className="mt-1 bg-rose-100 p-1.5 rounded-full text-rose-600 shrink-0">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                            <span className="text-zinc-700 font-medium leading-relaxed">{point}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    href="/educators"
                                    className="inline-flex items-center gap-2 font-semibold text-rose-600 hover:text-rose-700 hover:gap-3 transition-all"
                                >
                                    Explore all educators <ArrowRight className="w-5 h-5" />
                                </Link>
                            </motion.div>
                        </div>
                    </div>

                    <div className="flex-1 w-full order-1 lg:order-2">
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="relative aspect-square md:aspect-[4/3] max-w-lg mx-auto rounded-[2.5rem] overflow-hidden bg-zinc-100 border-4 border-white shadow-2xl"
                        >
                            <Image
                                src="/images/marketing_student.png"
                                fill
                                alt="Student experience"
                                className="object-cover"
                            />
                            {/* Overlay mock UI */}
                            <div className="absolute inset-x-8 bottom-8 top-16 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/5 border border-white/50 p-6 flex flex-col pt-10 group hover:-translate-y-2 transition-transform duration-500 cursor-default">
                                <div className="flex gap-4 items-center mb-8">
                                    <div className="w-16 h-16 rounded-full bg-zinc-200 shrink-0 border-2 border-white shadow-sm overflow-hidden relative">
                                        {/* Simulated face placeholder */}
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-10 bg-zinc-300 rounded-t-full"></div>
                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-zinc-300 rounded-full"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="w-32 h-4 bg-zinc-200 rounded-full"></div>
                                        <div className="w-24 h-3 bg-zinc-100 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-full h-3 bg-zinc-100 rounded-full"></div>
                                    <div className="w-4/5 h-3 bg-zinc-100 rounded-full"></div>
                                    <div className="w-11/12 h-3 bg-zinc-100 rounded-full"></div>
                                </div>
                                <div className="mt-auto pt-8 flex gap-3">
                                    <div className="w-full h-11 bg-zinc-900 rounded-xl flex items-center justify-center">
                                        <span className="w-16 h-2 bg-white/20 rounded-full"></span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
