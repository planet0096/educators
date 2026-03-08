"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: "easeOut" }
    };

    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
            {/* Background Image/Gradient */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/marketing_hero.png"
                    alt="Abstract glassmorphic background"
                    fill
                    className="object-cover opacity-[0.25] mix-blend-multiply"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/80 to-white"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeIn}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 border border-zinc-200 text-sm font-medium text-zinc-800 mb-8 shadow-sm"
                >
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    The Future of Personalized Learning
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-8 max-w-4xl mx-auto"
                >
                    Where Top Educators Meet Driven Students.
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-lg md:text-xl text-zinc-600 mb-10 max-w-2xl mx-auto leading-relaxed"
                >
                    A premium marketplace with 0% uncertainty. Verified globally. Run your teaching business on auto-pilot or find the perfect mentor.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Link
                        href="/educator/register"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/20"
                    >
                        Start Getting Students
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/educators"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-zinc-900 border border-zinc-200 rounded-full font-medium hover:bg-zinc-50 hover:border-zinc-300 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                    >
                        Find an Educator
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
