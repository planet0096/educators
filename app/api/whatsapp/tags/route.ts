import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import ContactTag from "@/models/ContactTag";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const tags = await ContactTag.find({ educatorId: session.user.id }).sort({ createdAt: -1 });

        return NextResponse.json({ tags }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching Contact Tags:", error);
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
        const { name, color } = body;

        if (!name) {
            return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
        }

        await dbConnect();

        const existingTag = await ContactTag.findOne({ educatorId: session.user.id, name });
        if (existingTag) {
            return NextResponse.json({ error: "Tag with this name already exists" }, { status: 400 });
        }

        const newTag = await ContactTag.create({
            educatorId: session.user.id,
            name,
            color: color || "#E5E7EB"
        });

        return NextResponse.json({ success: true, tag: newTag }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating Contact Tag:", error);
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
        const tagId = url.searchParams.get("id");

        if (!tagId) {
            return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
        }

        await dbConnect();

        const deletedTag = await ContactTag.findOneAndDelete({ _id: tagId, educatorId: session.user.id });

        if (!deletedTag) {
            return NextResponse.json({ error: "Tag not found or unauthorized to delete" }, { status: 404 });
        }

        // Ideally, we should also pull this tag ID from any contacts that have it assigned
        // This can be done via a Mongoose post hook or directly here
        const Contact = (await import("@/models/Contact")).default;
        await Contact.updateMany({ tags: tagId }, { $pull: { tags: tagId } });

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error("Error deleting Contact Tag:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
