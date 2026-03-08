import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import CustomField from "@/models/CustomField";

// Utility: convert label to key slug
function labelToKey(label: string): string {
    return label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s_]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 40);
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await dbConnect();

        const fields = await CustomField.find({ educatorId: session.user.id })
            .sort({ order: 1, createdAt: 1 })
            .lean();

        return NextResponse.json({ success: true, fields }, { status: 200 });
    } catch (error) {
        console.error("Error fetching custom fields:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { label, type, options, isRequired } = body;

        if (!label || !type) {
            return NextResponse.json({ error: "Label and type are required" }, { status: 400 });
        }

        await dbConnect();

        // Generate key from label
        const baseKey = labelToKey(label);
        // Ensure unique key for this educator
        let key = baseKey;
        let suffix = 1;
        while (await CustomField.exists({ educatorId: session.user.id, key })) {
            key = `${baseKey}_${suffix++}`;
        }

        // Get max order
        const last = await CustomField.findOne({ educatorId: session.user.id }).sort({ order: -1 }).lean();
        const order = last ? (last as any).order + 1 : 0;

        const field = await CustomField.create({
            educatorId: session.user.id,
            key,
            label: label.trim(),
            type,
            options: type === "dropdown" ? (options || []) : [],
            isRequired: isRequired || false,
            order,
        });

        return NextResponse.json({ success: true, field }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating custom field:", error);
        if (error.code === 11000) {
            return NextResponse.json({ error: "A field with this key already exists." }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
