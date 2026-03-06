import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

const PLANS = {
    starter: { amount: 299, name: "Starter Plan" },
    growth: { amount: 499, name: "Growth Plan" },
    unlimited: { amount: 899, name: "Unlimited Plan" }
};

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only educators can recharge their wallets
        if ((session.user as any).role !== "educator") {
            return NextResponse.json(
                { error: "Only educators can recharge their wallet." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { planId } = body;

        const plan = PLANS[planId as keyof typeof PLANS];

        if (!plan) {
            return NextResponse.json(
                { error: "Invalid plan selected." },
                { status: 400 }
            );
        }

        await dbConnect();

        // Simulate payment gateway processing
        // In reality, this would be a Stripe Webhook verification endpoint
        const rechargeAmount = plan.amount;

        // Atomically increment the educator's wallet balance
        const updatedEducator = await User.findByIdAndUpdate(
            session.user.id,
            { $inc: { walletBalance: rechargeAmount } },
            { new: true }
        );

        if (!updatedEducator) {
            return NextResponse.json(
                { error: "Educator account not found." },
                { status: 404 }
            );
        }

        // Record the transaction
        await Transaction.create({
            educatorId: session.user.id,
            amount: rechargeAmount,
            type: "credit",
            description: `Recharge via ${plan.name}`
        });

        return NextResponse.json(
            {
                success: true,
                message: "Wallet recharged successfully!",
                newBalance: updatedEducator.walletBalance
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error recharging wallet:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
