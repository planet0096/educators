import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Contact from "@/models/Contact";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const search = url.searchParams.get("search") || "";
        const listId = url.searchParams.get("listId");
        const tagId = url.searchParams.get("tagId");

        const query: any = { educatorId: session.user.id };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } }
            ];
        }

        if (listId) {
            query.lists = listId;
        }

        if (tagId) {
            query.tags = tagId;
        }

        const skip = (page - 1) * limit;

        const [contacts, total] = await Promise.all([
            Contact.find(query)
                .populate("lists", "name")
                .populate("tags", "name color")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Contact.countDocuments(query)
        ]);

        return NextResponse.json({
            contacts,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching Contacts:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, email, phone, lists, tags } = body;

        if (!name || !phone) {
            return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
        }

        await dbConnect();

        // Check for existing phone number for this educator
        const existingContact = await Contact.findOne({ educatorId: session.user.id, phone });
        if (existingContact) {
            return NextResponse.json({ error: "Contact with this phone number already exists" }, { status: 400 });
        }

        const newContact = await Contact.create({
            educatorId: session.user.id,
            name,
            email,
            phone,
            lists: lists || [],
            tags: tags || []
        });

        const populatedContact = await Contact.findById(newContact._id)
            .populate("lists", "name")
            .populate("tags", "name color")
            .lean();

        return NextResponse.json({ success: true, contact: populatedContact }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating Contact:", error);
        if (error.code === 11000) {
            return NextResponse.json({ error: "A contact with this phone or email already exists." }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
