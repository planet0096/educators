import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Profile from "@/models/Profile";

export async function PUT(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        console.log("RECEIVED API BODY:", JSON.stringify(body, null, 2));

        await dbConnect();

        // Ensure we are only updating the profile belonging to the authenticated user
        const updatedProfile = await Profile.findOneAndUpdate(
            { user: session.user.id },
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!updatedProfile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, profile: updatedProfile }, { status: 200 });
    } catch (error: any) {
        console.error("Error updating profile:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
