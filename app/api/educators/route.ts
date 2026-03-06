import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Profile from "@/models/Profile";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(req: Request) {
    try {
        await dbConnect();

        // Get URL and search params
        const { searchParams } = new URL(req.url);

        // Extract filter query parameters
        const country = searchParams.get("country");
        const city = searchParams.get("city");
        const skill = searchParams.get("skill");
        const limitStr = searchParams.get("limit");

        const limit = limitStr ? parseInt(limitStr) : 50; // Default limit

        // 1. First, get all users who are explicitly educators
        const educatorUsers = await User.find({ role: "educator" }).select("_id").lean();
        const educatorUserIds = educatorUsers.map(u => u._id);

        // Build the MongoDB Match Query
        let query: any = {
            user: { $in: educatorUserIds }
        };

        // 2. Country Filter
        if (country) {
            query["location.country"] = { $regex: country, $options: "i" };
        }

        // 3. City Filter
        if (city) {
            query["location.city"] = { $regex: city, $options: "i" };
        }

        // 4. Skill Filter
        if (skill) {
            query.skills = { $regex: skill, $options: "i" };
        }

        // Fetch profiles matching the query with User populated (if needed for avatar/email later)
        const profiles = await Profile.find(query)
            .sort({ createdAt: -1 }) // Newest profiles first
            .limit(limit)
            .populate('user', 'email avatar') // Populate basic user info
            .lean(); // Lean for faster read-only execution

        return NextResponse.json({ success: true, educators: profiles }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching educators:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
