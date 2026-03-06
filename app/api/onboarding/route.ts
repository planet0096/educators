import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Profile from "@/models/Profile";
import User from "@/models/User";

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        await dbConnect();

        // Upsert the profile
        const profile = await Profile.findOneAndUpdate(
            { user: session.user.id },
            { ...body, user: session.user.id },
            { new: true, upsert: true }
        );

        // Mark onboarding as completed for the user
        await User.findByIdAndUpdate(session.user.id, {
            onboardingCompleted: true,
        });

        return NextResponse.json({ success: true, profile }, { status: 200 });
    } catch (error: any) {
        console.error("Error saving profile:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
