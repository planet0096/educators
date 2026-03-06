"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard, Search, Users, BookOpen, Zap,
    Bell, Menu, X, Mail, MessageCircle, Calendar, Rss,
    PanelLeftClose, PanelLeftOpen, User
} from "lucide-react";
import UserDropdown from "@/components/UserDropdown";

interface SidebarLayoutProps {
    children: React.ReactNode;
    userRole: string;
    walletBalance: number;
    userEmail: string;
}

export default function SidebarLayout({ children, userRole, walletBalance, userEmail }: SidebarLayoutProps) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    // Desktop sidebar is pinned (open) by default
    const [isDesktopPinned, setIsDesktopPinned] = useState(true);

    // The sidebar is visually expanded simply based on the pinned state
    const isDesktopExpanded = isDesktopPinned;

    const pathname = usePathname();

    // Close sidebar on mobile when route changes
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    const educatorLinks = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "My Profile", href: "/dashboard/profile", icon: User },
        { name: "Find Students", href: "/dashboard/students", icon: Search },
        { name: "Leads CRM", href: "/dashboard/leads", icon: Users },
        { name: "WhatsApp CRM", href: "/dashboard/whatsapp", icon: MessageCircle },
        { name: "Resources", href: "#", icon: BookOpen },
    ];

    const studentLinks = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Find Educators", href: "/educators", icon: Search },
        { name: "Resources", href: "#", icon: BookOpen },
    ];

    const placeholderLinks = [
        { name: "Email Campaigns", href: "#", icon: Mail, isNew: true },
        { name: "Bookings", href: "#", icon: Calendar, isNew: true },
        { name: "Feed & Blog", href: "#", icon: Rss, isNew: true },
    ];

    const mainLinks = userRole === "educator" ? educatorLinks : studentLinks;

    // The inner content rendered by both Mobile and Desktop sidebars
    // It receives 'expanded' prop to know whether to show labels
    const SidebarContent = ({ expanded }: { expanded: boolean }) => (
        <div className={`flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-8 scrollbar-hide ${expanded ? 'px-4' : 'px-3'}`}>
            {/* Main Menu */}
            <div>
                {expanded && <p className="px-3 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 whitespace-nowrap">Main Menu</p>}
                <nav className="space-y-1">
                    {mainLinks.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                title={!expanded ? link.name : undefined}
                                className={`
                                    flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                    ${expanded ? 'px-3' : 'justify-center w-10 mx-auto'}
                                    ${isActive
                                        ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/10'
                                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}
                                `}
                            >
                                <link.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-zinc-300' : 'text-zinc-400'}`} />
                                {expanded && <span className="whitespace-nowrap">{link.name}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Marketing & Tools (Future) */}
            {userRole === "educator" && (
                <div>
                    {expanded && (
                        <p className="px-3 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2 whitespace-nowrap">
                            Growth Tools
                        </p>
                    )}
                    {expanded ? (
                        <nav className="space-y-1">
                            {placeholderLinks.map((link) => (
                                <button
                                    key={link.name}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition-all duration-200 cursor-not-allowed group opacity-75"
                                    title="Coming Soon"
                                >
                                    <div className="flex items-center gap-3">
                                        <link.icon className="w-5 h-5 shrink-0 text-zinc-400 group-hover:text-zinc-500" />
                                        <span className="whitespace-nowrap">{link.name}</span>
                                    </div>
                                    {link.isNew && (
                                        <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200 whitespace-nowrap">
                                            Soon
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    ) : (
                        // Collapsed state map, just icons
                        <div className="space-y-3 flex flex-col items-center border-t border-zinc-100 pt-6 mt-6">
                            {placeholderLinks.map((link) => (
                                <div key={link.name} className="relative group cursor-not-allowed opacity-50">
                                    <div className="p-2.5 rounded-xl hover:bg-zinc-100 transition-colors">
                                        <link.icon className="w-5 h-5 text-zinc-400" />
                                    </div>
                                    {/* Mini Tooltip */}
                                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                        {link.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans text-zinc-900 selection:bg-zinc-200">

            {/* Mobile Top Header */}
            <header className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200 h-16 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 -ml-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-zinc-900 rounded-lg flex items-center justify-center shadow-sm">
                            <span className="text-white font-semibold text-sm">E</span>
                        </div>
                        <span className="font-semibold tracking-tight">Educators</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {userRole === "educator" && (
                        <Link href="/dashboard/plans" className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-semibold hover:bg-emerald-100 transition-colors">
                            <Zap className="w-3.5 h-3.5" />
                            <span>${walletBalance}</span>
                        </Link>
                    )}
                    <UserDropdown userEmail={userEmail} />
                </div>
            </header>

            {/* Mobile Sidebar Backdrop & Drawer via Framer Motion */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 z-40 bg-zinc-900/20 backdrop-blur-sm md:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col shadow-2xl md:hidden"
                        >
                            <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-100 shrink-0">
                                <span className="font-bold tracking-tight text-lg text-zinc-900 ml-2">Menu</span>
                                <button
                                    onClick={() => setIsMobileOpen(false)}
                                    className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            {/* Mobile is always expanded */}
                            <SidebarContent expanded={true} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Permanent Expandable Sidebar */}
            <motion.aside
                animate={{ width: isDesktopExpanded ? 288 : 80 }} // 288px = w-72, 80px = w-20
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="hidden md:flex sticky top-0 h-[100dvh] bg-white border-r border-zinc-200 shrink-0 flex-col z-20 group relative"
            >
                <div className={`h-16 flex items-center justify-between border-b border-zinc-100 shrink-0 transition-all duration-300 ${isDesktopExpanded ? 'px-6' : 'px-0 justify-center'}`}>
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                            <span className="text-white font-bold text-lg leading-none">E</span>
                        </div>
                        {isDesktopExpanded && (
                            <span className="font-bold tracking-tight text-lg text-zinc-900 whitespace-nowrap">Educators</span>
                        )}
                    </Link>

                    {/* Pin/Unpin Toggle Button */}
                    <button
                        onClick={() => setIsDesktopPinned(!isDesktopPinned)}
                        className="absolute -right-3 top-5 w-6 h-6 bg-white border border-zinc-200 shadow-sm rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors z-50 flex items-center justify-center cursor-pointer pointer-events-auto"
                        title={isDesktopPinned ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        {isDesktopPinned ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                </div>
                <SidebarContent expanded={isDesktopExpanded} />
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 w-full min-w-0 flex flex-col min-h-screen">
                {/* Desktop Top Bar */}
                <header className="hidden md:flex sticky top-0 z-10 h-16 bg-white/80 backdrop-blur-md items-center justify-between px-8 border-b border-zinc-200 shrink-0">
                    <div className="w-full max-w-lg relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search everything..."
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-2 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:bg-white transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-5">
                        {userRole === "educator" && (
                            <Link
                                href="/dashboard/plans"
                                className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full hover:bg-emerald-100 transition-colors border border-emerald-200/60 shadow-sm"
                            >
                                <Zap className="w-4 h-4" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 leading-none">Wallet</span>
                                    <span className="text-sm font-bold leading-none">${walletBalance}</span>
                                </div>
                            </Link>
                        )}
                        <div className="h-6 w-px bg-zinc-200"></div>
                        <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-zinc-50"></span>
                        </button>
                        <UserDropdown userEmail={userEmail} />
                    </div>
                </header>

                <div className="p-4 md:p-8 flex-1">
                    <div className="max-w-6xl mx-auto w-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
