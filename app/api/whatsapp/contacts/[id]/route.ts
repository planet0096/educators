import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Contact from "@/models/Contact";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
        }

        const body = await req.json();
        const { name, email, phone, lists, tags } = body;

        await dbConnect();

        // Check if updating phone number and it already exists on another contact
        if (phone) {
            const existingContact = await Contact.findOne({
                educatorId: session.user.id,
                phone,
                _id: { $ne: id }
            });
            if (existingContact) {
                return NextResponse.json({ error: "Another contact with this phone number already exists" }, { status: 400 });
            }
        }

        const updatedContact = await Contact.findOneAndUpdate(
            { _id: id, educatorId: session.user.id },
            {
                $set: {
                    ...(name && { name }),
                    ...(email !== undefined && { email }),
                    ...(phone && { phone }),
                    ...(lists && { lists }),
                    ...(tags && { tags })
                }
            },
            { new: true }
        )
            .populate("lists", "name")
            .populate("tags", "name color")
            .lean();

        if (!updatedContact) {
            return NextResponse.json({ error: "Contact not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true, contact: updatedContact }, { status: 200 });

    } catch (error: any) {
        console.error("Error updating Contact:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
        }

        await dbConnect();

        const deletedContact = await Contact.findOneAndDelete({ _id: id, educatorId: session.user.id });

        if (!deletedContact) {
            return NextResponse.json({ error: "Contact not found or unauthorized to delete" }, { status: 404 });
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error("Error deleting Contact:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
