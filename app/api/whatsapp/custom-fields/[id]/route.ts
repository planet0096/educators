import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CustomField from "@/models/CustomField";
import Contact from "@/models/Contact";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { label, options, isRequired, order } = body;

        await dbConnect();

        const updated = await CustomField.findOneAndUpdate(
            { _id: id, educatorId: session.user.id },
            {
                $set: {
                    ...(label && { label: label.trim() }),
                    ...(options !== undefined && { options }),
                    ...(isRequired !== undefined && { isRequired }),
                    ...(order !== undefined && { order }),
                },
            },
            { new: true }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: "Field not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, field: updated }, { status: 200 });
    } catch (error) {
        console.error("Error updating custom field:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await dbConnect();

        const field = await CustomField.findOneAndDelete({ _id: id, educatorId: session.user.id });
        if (!field) {
            return NextResponse.json({ error: "Field not found" }, { status: 404 });
        }

        // Remove this custom field's value from all contacts
        await Contact.updateMany(
            { educatorId: session.user.id },
            { $unset: { [`customFieldValues.${field.key}`]: "" } }
        );

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Error deleting custom field:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
