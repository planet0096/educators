import Link from "next/link";

export default function Navbar() {
    return (
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
    );
}
