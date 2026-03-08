import Link from "next/link";

export default function Footer() {
    return (
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
    );
}
