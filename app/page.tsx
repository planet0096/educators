"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Target, Users, ShieldCheck, CheckCircle2 } from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-zinc-200">
      {/* ====== NAVBAR ====== */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">E</span>
            </div>
            <span className="font-semibold text-lg tracking-tight">Educators</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="text-sm font-medium bg-zinc-900 text-white px-5 py-2.5 rounded-full hover:bg-zinc-800 transition-colors shadow-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ====== HERO SECTION ====== */}
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
            initial="initial" animate="animate" variants={fadeIn}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 border border-zinc-200 text-sm font-medium text-zinc-800 mb-8 shadow-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            The Future of Personalized Learning
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-8 max-w-4xl mx-auto"
          >
            Where Top Educators Meet Driven Students.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-600 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            A premium marketplace with 0% uncertainty. Verified globally. Run your teaching business on auto-pilot or find the perfect mentor.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/educator/register" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/20">
              Start Getting Students
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/educators" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-zinc-900 border border-zinc-200 rounded-full font-medium hover:bg-zinc-50 hover:border-zinc-300 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm">
              Find an Educator
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ====== EDUCATOR VALUE PROP ====== */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6">Built for Modern Educators</h2>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">We've entirely redesigned the marketplace model so you can focus completely on teaching, not marketing.</p>
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
                initial="initial" whileInView="animate" viewport={{ once: true }}
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

      {/* ====== STUDENT VALUE PROP ====== */}
      <section className="py-24 overflow-hidden border-t border-zinc-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 order-2 lg:order-1">
              <div className="w-full max-w-lg">
                <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                  <span className="text-sm font-bold tracking-wider uppercase text-rose-500 mb-3 block">For Students</span>
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

                  <Link href="/educators" className="inline-flex items-center gap-2 font-semibold text-rose-600 hover:text-rose-700 hover:gap-3 transition-all">
                    Explore all educators <ArrowRight className="w-5 h-5" />
                  </Link>
                </motion.div>
              </div>
            </div>

            <div className="flex-1 w-full order-1 lg:order-2">
              <motion.div
                initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
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

      {/* ====== FOOTER ====== */}
      <footer className="bg-zinc-950 text-zinc-400 py-16 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6 text-white cursor-default">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center">
                  <span className="text-zinc-900 font-bold text-lg leading-none">E</span>
                </div>
                <span className="font-semibold text-xl tracking-tight">Educators</span>
              </div>
              <p className="max-w-sm text-sm leading-relaxed">Empowering the world's best educators to build their independence, and helping students find their perfect match.</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-5">Platform</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/educators" className="hover:text-white transition-colors">Find an Educator</Link></li>
                <li><Link href="/educator/register" className="hover:text-white transition-colors">Start Teaching</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-5">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-zinc-900/50 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p>© {new Date().getFullYear()} Educators Network. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-white transition-colors cursor-pointer">Instagram</span>
              <span className="hover:text-white transition-colors cursor-pointer">Twitter</span>
              <span className="hover:text-white transition-colors cursor-pointer">LinkedIn</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
