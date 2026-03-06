import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Contact from "@/models/Contact";

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { targetLists, targetTags } = body;

        await dbConnect();

        const query: any = { educatorId: session.user.id };

        if (targetLists?.length > 0 && targetTags?.length > 0) {
            query.$or = [
                { lists: { $in: targetLists } },
                { tags: { $in: targetTags } }
            ];
        } else if (targetLists?.length > 0) {
            query.lists = { $in: targetLists };
        } else if (targetTags?.length > 0) {
            query.tags = { $in: targetTags };
        } else {
            // No lists or tags selected
            return NextResponse.json({ count: 0 }, { status: 200 });
        }

        const count = await Contact.countDocuments(query);

        return NextResponse.json({ count }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching Contact Count:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
