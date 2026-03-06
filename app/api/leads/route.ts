import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import User from "@/models/User";
import Profile from "@/models/Profile";

import Transaction from "@/models/Transaction";

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only students can create leads
        if ((session.user as any).role !== "student") {
            return NextResponse.json(
                { error: "Only students can request a call." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { educatorId } = body;

        if (!educatorId) {
            return NextResponse.json(
                { error: "Educator ID is required." },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if the educator exists and has the 'educator' role
        const educator = await User.findById(educatorId);
        if (!educator || educator.role !== "educator") {
            return NextResponse.json(
                { error: "Invalid educator profile." },
                { status: 404 }
            );
        }

        // Prevent self-request (just in case)
        if (educatorId === session.user.id) {
            return NextResponse.json(
                { error: "Cannot send a request to yourself." },
                { status: 400 }
            );
        }

        // Check for existing pending request to avoid spam
        const existingLead = await Lead.findOne({
            educatorId,
            studentId: session.user.id,
            status: "pending",
        });

        if (existingLead) {
            return NextResponse.json(
                { error: "You already have a pending request with this educator." },
                { status: 409 }
            );
        }

        // Pay-per-lead verification
        const LEAD_COST = 5;

        // Atomically decriment the wallet if there are sufficient funds
        const updatedEducator = await User.findOneAndUpdate(
            { _id: educatorId, walletBalance: { $gte: LEAD_COST } },
            { $inc: { walletBalance: -LEAD_COST } },
            { new: true }
        );

        if (!updatedEducator) {
            return NextResponse.json(
                { error: "This educator is currently not accepting new student leads. (Insufficient wallet balance)" },
                { status: 403 }
            );
        }

        // Create the new lead
        const lead = await Lead.create({
            educatorId,
            studentId: session.user.id,
            status: "pending",
        });

        // Record the transaction
        await Transaction.create({
            educatorId: educatorId,
            amount: LEAD_COST,
            type: "debit",
            description: `Lead connection requested by student (${session.user.email})`
        });

        return NextResponse.json(
            { success: true, message: "Request sent successfully!", lead },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error creating lead:", error);

        // Handle MongoDB duplicate key error for multi-status checks
        if (error.code === 11000) {
            return NextResponse.json(
                { error: "You already have a request with this educator." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only educators can view their leads
        if ((session.user as any).role !== "educator") {
            return NextResponse.json(
                { error: "Only educators can view the CRM." },
                { status: 403 }
            );
        }

        await dbConnect();

        // Fetch leads for the logged in educator, sort by newest first
        const leads = await Lead.find({ educatorId: session.user.id })
            .sort({ createdAt: -1 })
            .lean();

        // We need to fetch the student profiles manually to inject names, target exams, etc.
        const studentIds = leads.map(lead => lead.studentId);

        const studentProfiles = await Profile.find({
            user: { $in: studentIds }
        }).lean();

        const studentUsers = await User.find({
            _id: { $in: studentIds }
        }).select('email').lean();

        // Map the data together
        const enrichedLeads = leads.map(lead => {
            const profile = studentProfiles.find(p => p.user.toString() === lead.studentId.toString());
            const user = studentUsers.find(u => u._id.toString() === lead.studentId.toString());

            return {
                ...lead,
                student: {
                    id: lead.studentId,
                    email: user?.email,
                    firstName: profile?.firstName || "Unknown",
                    lastName: profile?.lastName || "Student",
                    phoneNumber: profile?.phoneNumber,
                    targetExam: profile?.targetExam,
                    examDate: profile?.examDate,
                    location: profile?.location,
                }
            };
        });

        return NextResponse.json({ success: true, leads: enrichedLeads }, { status: 200 });
    } catch (error: any) {
        console.error("Error fetching leads:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
