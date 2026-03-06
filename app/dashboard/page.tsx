import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import dbConnect from "@/lib/db";
import Profile from "@/models/Profile";
import UserModel from "@/models/User";
import Lead from "@/models/Lead";
import {
    LayoutDashboard, Users, FileText, Zap,
    ArrowRight, PhoneCall, Video, UserCheck,
    Wallet, TrendingUp, BarChart3, Activity,
    PlayCircle, HeadphonesIcon, HelpCircle
} from "lucide-react";

export default async function DashboardMainPage() {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        redirect("/login");
    }

    await dbConnect();

    // Fetch the user's profile and user document
    const [profile, userDoc] = await Promise.all([
        Profile.findOne({ user: session.user.id }).lean(),
        UserModel.findById(session.user.id).select("walletBalance role").lean()
    ]);

    const isEducator = userDoc?.role === "educator";

    // Redirect students directly to the old home or a student-specific home
    // For now, if they are a student, we just show them a simple view or redirect them to find educators
    if (!isEducator) {
        redirect("/educators");
    }

    const walletBalance = userDoc?.walletBalance || 0;
    const hasProfile = !!profile;
    const hasWalletRecharged = walletBalance > 0;

    // Calculate Leads Stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const [leadsToday, leadsWeek, leadsMonth, leadsTotal] = await Promise.all([
        Lead.countDocuments({ educatorId: session.user.id, createdAt: { $gte: todayStart } }),
        Lead.countDocuments({ educatorId: session.user.id, createdAt: { $gte: lastWeekStart } }),
        Lead.countDocuments({ educatorId: session.user.id, createdAt: { $gte: lastMonthStart } }),
        Lead.countDocuments({ educatorId: session.user.id })
    ]);

    // Onboarding Steps logic
    const steps = [
        {
            title: "Complete Profile",
            description: "Set up your public directory profile.",
            href: hasProfile ? "/dashboard/profile" : "/dashboard/edit-profile",
            isCompleted: hasProfile,
            icon: FileText
        },
        {
            title: "Recharge Wallet",
            description: "Add credits to request student contacts.",
            href: "/dashboard/plans",
            isCompleted: hasWalletRecharged,
            icon: Wallet
        },
        {
            title: "Get Leads",
            description: "Find students waiting to be taught.",
            href: "/dashboard/students",
            isCompleted: leadsTotal > 0,
            icon: Users
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Greeting Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-200">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                        Overview Dashboard
                    </h1>
                    <p className="text-zinc-500 mt-1">Track your performance and manage your leads efficiently.</p>
                </div>
            </div>

            {/* Quick Steps (Onboarding / Progress) */}
            <section>
                <h2 className="text-sm font-bold tracking-wider text-zinc-400 uppercase mb-4">Getting Started</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {steps.map((step, idx) => (
                        <Link
                            key={idx}
                            href={step.href}
                            className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
                                ${step.isCompleted
                                    ? 'bg-emerald-50 border-emerald-200/60'
                                    : 'bg-white border-zinc-200 hover:border-zinc-300'}
                            `}
                        >
                            <div className="flex items-start justify-between">
                                <div className={`p-3 rounded-xl ${step.isCompleted ? 'bg-emerald-100/50 text-emerald-600' : 'bg-zinc-100 text-zinc-600'}`}>
                                    <step.icon className="w-6 h-6" />
                                </div>
                                {step.isCompleted && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full uppercase tracking-wide">
                                        <UserCheck className="w-3.5 h-3.5" /> Done
                                    </span>
                                )}
                            </div>
                            <div className="mt-4">
                                <h3 className={`font-semibold ${step.isCompleted ? 'text-emerald-900' : 'text-zinc-900'}`}>{step.title}</h3>
                                <p className={`text-sm mt-1 ${step.isCompleted ? 'text-emerald-700/80' : 'text-zinc-500'}`}>{step.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Stats Section */}
                <section className="col-span-1 lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold tracking-wider text-zinc-400 uppercase">Performance Stats</h2>
                        <Link href="/dashboard/leads" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group">
                            View All Leads <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">Profile Views</span>
                            </div>
                            <div className="text-3xl font-black text-zinc-900">0</div>
                            <p className="text-xs text-zinc-400 mt-1 font-medium">All time</p>
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                <Activity className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">Leads Today</span>
                            </div>
                            <div className="text-3xl font-black text-zinc-900">{leadsToday}</div>
                            <p className="text-xs text-zinc-400 mt-1 font-medium">Last 24 hours</p>
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                <BarChart3 className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">This Week</span>
                            </div>
                            <div className="text-3xl font-black text-zinc-900">{leadsWeek}</div>
                            <p className="text-xs text-zinc-400 mt-1 font-medium">Last 7 days</p>
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm bg-gradient-to-b from-zinc-50 to-white">
                            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                <Users className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">All Leads</span>
                            </div>
                            <div className="text-3xl font-black text-zinc-900">{leadsTotal}</div>
                            <p className="text-xs text-zinc-400 mt-1 font-medium">Lifetime total</p>
                        </div>

                    </div>
                </section>

                {/* Right sidebar logic layout */}
                <section className="col-span-1 space-y-6">
                    {/* Wallet Widget */}
                    <div>
                        <h2 className="text-sm font-bold tracking-wider text-zinc-400 uppercase mb-4">Wallet & Billing</h2>
                        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Zap className="w-24 h-24 rotate-12" />
                            </div>
                            <div className="relative z-10">
                                <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Available Balance</div>
                                <div className="text-4xl font-black mb-4">${walletBalance}</div>

                                <div className="bg-black/20 rounded-xl p-3 mb-4 backdrop-blur-sm border border-white/10">
                                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                                        <span className="text-white font-bold">Standard Cost:</span> $5 per unique student lead request. 0% uncertainty.
                                    </p>
                                </div>

                                <Link
                                    href="/dashboard/plans"
                                    className="flex w-full items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-900 font-bold py-2.5 rounded-xl transition-colors text-sm"
                                >
                                    Recharge Now <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Support & Training Links */}
                    <div>
                        <h2 className="text-sm font-bold tracking-wider text-zinc-400 uppercase mb-4">Help & Tutorials</h2>
                        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">

                            {/* Help & Support */}
                            <button className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all group text-left w-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <HeadphonesIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-900 text-sm">Customer Support</p>
                                        <p className="text-xs text-zinc-500">Request a call or video chat</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600" />
                            </button>

                            {/* Video Tutorials */}
                            <button className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all group text-left w-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <PlayCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-900 text-sm">Video Tutorials</p>
                                        <p className="text-xs text-zinc-500">Learn how the platform works</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600" />
                            </button>

                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
