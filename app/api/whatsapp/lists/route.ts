import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import ContactList from "@/models/ContactList";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const lists = await ContactList.find({ educatorId: session.user.id }).sort({ createdAt: -1 });

        return NextResponse.json({ lists }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching Contact Lists:", error);
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
        const { name, description } = body;

        if (!name) {
            return NextResponse.json({ error: "List name is required" }, { status: 400 });
        }

        await dbConnect();

        const existingList = await ContactList.findOne({ educatorId: session.user.id, name });
        if (existingList) {
            return NextResponse.json({ error: "List with this name already exists" }, { status: 400 });
        }

        const newList = await ContactList.create({
            educatorId: session.user.id,
            name,
            description
        });

        return NextResponse.json({ success: true, list: newList }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating Contact List:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const listId = url.searchParams.get("id");

        if (!listId) {
            return NextResponse.json({ error: "List ID is required" }, { status: 400 });
        }

        await dbConnect();

        const deletedList = await ContactList.findOneAndDelete({ _id: listId, educatorId: session.user.id });

        if (!deletedList) {
            return NextResponse.json({ error: "List not found or unauthorized to delete" }, { status: 404 });
        }

        // Ideally, we should also pull this list ID from any contacts that have it assigned
        // This can be done via a Mongoose post hook or directly here
        const Contact = (await import("@/models/Contact")).default;
        await Contact.updateMany({ lists: listId }, { $pull: { lists: listId } });

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error("Error deleting Contact List:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
