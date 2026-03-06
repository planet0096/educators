import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Authentication - Educators Network",
    description: "Login or register for the Educators Network.",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full bg-white text-zinc-900 font-sans selection:bg-zinc-200">
            {children}
        </div>
    );
}
