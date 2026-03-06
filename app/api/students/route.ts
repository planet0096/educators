import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import ProfileModel from "@/models/Profile";
import LeadModel from "@/models/Lead";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || (session.user as any).role !== "educator") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const examParams = url.searchParams.get("exam");
        const locationParams = url.searchParams.get("location");

        const skip = (page - 1) * limit;

        // 1. Find all student User IDs
        const studentUsers = await UserModel.find({ role: "student" }).select("_id email").lean();
        const studentIds = studentUsers.map((u) => u._id);

        // 2. Build Profile Filter
        const filter: any = { user: { $in: studentIds } };

        if (examParams && examParams !== "All") {
            filter.targetExam = { $regex: new RegExp(examParams, "i") };
        }

        if (locationParams && locationParams !== "All") {
            filter.$or = [
                { "location.city": { $regex: new RegExp(locationParams, "i") } },
                { "location.country": { $regex: new RegExp(locationParams, "i") } }
            ];
        }

        // 3. Fetch Paginated Profiles
        const [profiles, total] = await Promise.all([
            ProfileModel.find(filter)
                .populate("user", "email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ProfileModel.countDocuments(filter)
        ]);

        // 4. Determine Unlocked Status for Current Educator
        const unlockedLeads = await LeadModel.find({
            educatorId: session.user.id,
            status: "accepted"
        }).select("studentId").lean();

        const unlockedSet = new Set(unlockedLeads.map((l: any) => l.studentId.toString()));

        // 5. Blur/Strip restricted data
        const safeProfiles = profiles.map((p: any) => {
            const isUnlocked = unlockedSet.has(p.user._id.toString());

            if (!isUnlocked) {
                // Strip PII
                p.lastName = p.lastName ? `${p.lastName.charAt(0)}.` : "";
                p.phoneNumber = null;
                if (p.user) {
                    p.user.email = null;
                }
            }

            return {
                ...p,
                isUnlocked
            };
        });

        return NextResponse.json({
            students: safeProfiles,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("GET /api/students error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
