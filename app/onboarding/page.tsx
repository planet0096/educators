import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Profile from "@/models/Profile";
import { SessionProvider } from "next-auth/react";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    await dbConnect();

    // If they already have a Profile, they don't need onboarding.
    const existingProfile = await Profile.findOne({ user: session.user.id }).select("_id").lean();

    if (existingProfile) {
        redirect("/dashboard");
    }

    return (
        <SessionProvider session={session}>
            <OnboardingForm />
        </SessionProvider>
    );
}
