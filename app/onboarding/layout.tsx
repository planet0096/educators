import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Complete Your Profile - Educators Network",
    description: "Set up your educator profile to connect with peers.",
};

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
            {/* Subtle Ambient Background */}
            <div className="fixed top-0 left-1/4 w-1/2 h-[300px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-1/2 h-[300px] bg-indigo-100/40 rounded-full blur-[100px] pointer-events-none" />

            {/* Grid Detail */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none mix-blend-multiply"></div>

            {/* Top Navigation / Header */}
            <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center shadow-sm">
                            <span className="text-white font-semibold text-lg tracking-tighter">E</span>
                        </div>
                        <span className="font-semibold tracking-tight text-zinc-900">Educators</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="container mx-auto px-4 py-12 relative z-10 flex justify-center">
                {children}
            </main>
        </div>
    );
}
