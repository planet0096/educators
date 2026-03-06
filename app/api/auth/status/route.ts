import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Profile from "@/models/Profile";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ authenticated: false, hasProfile: false }, { status: 401 });
        }

        await dbConnect();

        // Check if the user has completed onboarding by looking for a Profile
        const profile = await Profile.findOne({ user: session.user.id }).select("_id").lean();

        return NextResponse.json(
            {
                authenticated: true,
                hasProfile: !!profile,
                role: (session.user as any).role
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error("Auth Status Check Error:", error);
        return NextResponse.json(
            { error: "Failed to determine auth status" },
            { status: 500 }
        );
    }
}
