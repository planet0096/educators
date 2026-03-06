import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
    title: "Educator Profile - Educators Network",
    description: "View educator professional profile.",
};

export default function PublicProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200 flex flex-col">
            {/* Minimal Top Navigation Bar for Public View */}
            <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    {/* Logo & Brand */}
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center shadow-sm">
                                <span className="text-white font-semibold text-lg tracking-tighter">E</span>
                            </div>
                            <span className="font-semibold tracking-tight text-zinc-900 hidden md:inline-block">Educators</span>
                        </Link>
                    </div>

                    {/* Right side navigation (Join/Login) */}
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                            Log in
                        </Link>
                        <Link href="/register" className="text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors shadow-sm">
                            Join Network
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full">
                {children}
            </main>

            {/* Simple Footer */}
            <footer className="border-t border-zinc-200 bg-white mt-12 py-8 text-center text-sm text-zinc-500">
                <p>&copy; {new Date().getFullYear()} Educators Network. Empowering teaching professionals.</p>
            </footer>
        </div>
    );
}
