import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import Contact from "@/models/Contact";
import mongoose from "mongoose";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { contacts, updateExisting, targetLists, targetTags } = body;

        if (!Array.isArray(contacts) || contacts.length === 0) {
            return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
        }

        await dbConnect();
        const educatorId = session.user.id;

        const bulkOps = contacts.map((contact: any) => {
            // Strip out non-numeric characters from phone for normalization
            const rawPhone = contact.phone ? String(contact.phone).replace(/[\+\s\-]/g, "") : "";

            // Compile the update payload. Notice we use dot-notation for customFields so they don't overwrite unmapped ones on $set
            const updateSetPayload: any = {
                educatorId,
                email: contact.email,
                phone: rawPhone,
                city: contact.city,
                company: contact.company,
                website: contact.website,
                notes: contact.notes,
                source: "CSV Import",
            };

            // Remove undefined so $set doesn't erase them if they weren't mapped
            Object.keys(updateSetPayload).forEach(key => {
                if (updateSetPayload[key] === undefined) {
                    delete updateSetPayload[key];
                }
            });

            if (contact.customFieldValues) {
                Object.entries(contact.customFieldValues).forEach(([k, v]) => {
                    updateSetPayload[`customFieldValues.${k}`] = v;
                });
            }

            // We must set name if it's missing entirely
            const setOnInsertPayload: any = { createdAt: new Date() };
            if (!updateSetPayload.name) setOnInsertPayload.name = contact.name || "Unknown Selected Name";

            // If lists or tags are provided, we add them to the set without overriding existing
            const addToSetPayload: any = {};
            if (targetLists && targetLists.length > 0) {
                addToSetPayload.lists = { $each: targetLists };
            }
            if (targetTags && targetTags.length > 0) {
                addToSetPayload.tags = { $each: targetTags };
            }

            const updateOptions: any = {};
            if (Object.keys(addToSetPayload).length > 0) {
                updateOptions.$addToSet = addToSetPayload;
            }

            if (updateExisting) {
                return {
                    updateOne: {
                        filter: { educatorId, phone: rawPhone },
                        update: {
                            $set: updateSetPayload,
                            $setOnInsert: setOnInsertPayload,
                            ...updateOptions
                        },
                        upsert: true
                    }
                };
            } else {
                return {
                    updateOne: {
                        filter: { educatorId, phone: rawPhone },
                        update: {
                            $setOnInsert: { ...updateSetPayload, ...setOnInsertPayload },
                            ...updateOptions
                        },
                        upsert: true
                    }
                };
            }
        });

        const result = await Contact.bulkWrite(bulkOps, { ordered: false });

        return NextResponse.json({
            success: true,
            result: {
                insertedCount: result.upsertedCount || 0, // Since we used updateOne upsert instead of insertMany
                modifiedCount: result.modifiedCount || 0,
                upsertedCount: result.upsertedCount || 0
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error bulk importing contacts:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
