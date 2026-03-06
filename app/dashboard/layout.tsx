import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import SidebarLayout from "@/components/dashboard/SidebarLayout";

export const metadata: Metadata = {
    title: "Dashboard - Educators Network",
    description: "Welcome to your dashboard.",
};

export default async function DashboardLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    let walletBalance = 0;
    const userRole = (session?.user as any)?.role || "student";
    const userEmail = session?.user?.email || "";

    if (session?.user?.id && userRole === "educator") {
        await dbConnect();
        const userDoc = await UserModel.findById(session.user.id).select("walletBalance onboardingCompleted").lean();
        walletBalance = userDoc?.walletBalance || 0;

        if (!userDoc?.onboardingCompleted) {
            redirect("/onboarding");
        }
    }

    return (
        <SidebarLayout
            userRole={userRole}
            walletBalance={walletBalance}
            userEmail={userEmail}
        >
            {children}
        </SidebarLayout>
    );
}
