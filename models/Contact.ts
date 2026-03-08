import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
    educatorId: mongoose.Types.ObjectId;
    name: string;
    email?: string;
    phone: string;
    // Extended standard fields
    city?: string;
    company?: string;
    website?: string;
    notes?: string;
    source?: string;
    dateOfBirth?: Date;
    // Dynamic custom fields
    customFieldValues?: Map<string, any>;
    lists: mongoose.Types.ObjectId[];
    tags: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        email: { type: String },
        phone: { type: String, required: true },
        city: { type: String },
        company: { type: String },
        website: { type: String },
        notes: { type: String },
        source: { type: String, default: "Manual" },
        dateOfBirth: { type: Date },
        customFieldValues: { type: Map, of: Schema.Types.Mixed, default: {} },
        lists: [{ type: Schema.Types.ObjectId, ref: "ContactList" }],
        tags: [{ type: Schema.Types.ObjectId, ref: "ContactTag" }],
    },
    { timestamps: true }
);

// Compound index to ensure a phone number is unique per educator
ContactSchema.index({ educatorId: 1, phone: 1 }, { unique: true });
// Optional: index on email as well if emails are common
ContactSchema.index({ educatorId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true, $type: "string", $ne: "" } } });

// Delete cached model to ensure schema updates are always applied (important in Next.js hot-reload)
delete (mongoose.models as any).Contact;
export default mongoose.model<IContact>("Contact", ContactSchema);
