import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import LeadModel from "@/models/Lead";
import TransactionModel from "@/models/Transaction";
import mongoose from "mongoose";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || (session.user as any).role !== "educator") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { studentId } = await req.json();
        if (!studentId) {
            return NextResponse.json({ error: "Student ID required" }, { status: 400 });
        }

        await dbConnect();

        // Use a session transaction for atomicity (if MongoDB replica set is running)
        // For standalone, we bypass transactions but keep operations sequenced

        const educator = await UserModel.findById(session.user.id);
        if (!educator) return NextResponse.json({ error: "Educator not found" }, { status: 404 });

        const DEDUCTION_AMOUNT = 5;

        // 1. Check if already unlocked
        const existingLead = await LeadModel.findOne({ educatorId: session.user.id, studentId });
        if (existingLead && existingLead.status === "accepted") {
            return NextResponse.json({ error: "Already unlocked" }, { status: 400 });
        }

        // 2. Check Wallet Balance
        if (educator.walletBalance < DEDUCTION_AMOUNT) {
            return NextResponse.json({ error: "Insufficient wallet balance. Please recharge." }, { status: 402 });
        }

        // 3. Deduct Wallet
        educator.walletBalance -= DEDUCTION_AMOUNT;
        await educator.save();

        // 4. Log Transaction
        await TransactionModel.create({
            educatorId: session.user.id,
            amount: DEDUCTION_AMOUNT,
            type: "debit",
            description: `Unlocked student contact details (ID: ${studentId})`
        });

        // 5. Create or Update Lead
        if (existingLead) {
            existingLead.status = "accepted";
            await existingLead.save();
        } else {
            await LeadModel.create({
                educatorId: session.user.id,
                studentId,
                status: "accepted"
            });
        }

        return NextResponse.json({ success: true, newBalance: educator.walletBalance });

    } catch (error) {
        console.error("POST /api/students/unlock error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
