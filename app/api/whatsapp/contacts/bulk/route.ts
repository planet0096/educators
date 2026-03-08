import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Contact from "@/models/Contact";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { action, contactIds, listIds, tagIds, fieldKey, fieldValue } = body;

        if (!action || !contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return NextResponse.json({ error: "action and contactIds[] are required" }, { status: 400 });
        }

        await dbConnect();

        const baseQuery = { _id: { $in: contactIds }, educatorId: session.user.id };

        if (action === "delete") {
            const result = await Contact.deleteMany(baseQuery);
            return NextResponse.json({ success: true, deletedCount: result.deletedCount }, { status: 200 });
        }

        if (action === "assignLists") {
            if (!listIds || !Array.isArray(listIds)) {
                return NextResponse.json({ error: "listIds[] required for assignLists" }, { status: 400 });
            }
            // $addToSet to avoid duplicates
            await Contact.updateMany(baseQuery, { $addToSet: { lists: { $each: listIds } } });
            return NextResponse.json({ success: true }, { status: 200 });
        }

        if (action === "removeLists") {
            if (!listIds || !Array.isArray(listIds)) {
                return NextResponse.json({ error: "listIds[] required for removeLists" }, { status: 400 });
            }
            await Contact.updateMany(baseQuery, { $pullAll: { lists: listIds } });
            return NextResponse.json({ success: true }, { status: 200 });
        }

        if (action === "assignTags") {
            if (!tagIds || !Array.isArray(tagIds)) {
                return NextResponse.json({ error: "tagIds[] required for assignTags" }, { status: 400 });
            }
            await Contact.updateMany(baseQuery, { $addToSet: { tags: { $each: tagIds } } });
            return NextResponse.json({ success: true }, { status: 200 });
        }

        if (action === "removeTags") {
            if (!tagIds || !Array.isArray(tagIds)) {
                return NextResponse.json({ error: "tagIds[] required for removeTags" }, { status: 400 });
            }
            await Contact.updateMany(baseQuery, { $pullAll: { tags: tagIds } });
            return NextResponse.json({ success: true }, { status: 200 });
        }

        if (action === "updateCustomField") {
            if (!fieldKey) {
                return NextResponse.json({ error: "fieldKey required for updateCustomField" }, { status: 400 });
            }
            await Contact.updateMany(baseQuery, { $set: { [`customFieldValues.${fieldKey}`]: fieldValue } });
            return NextResponse.json({ success: true }, { status: 200 });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    } catch (error) {
        console.error("Error in bulk contacts action:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
