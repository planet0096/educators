import mongoose, { Schema, Document } from "mongoose";

export type CustomFieldType =
    | "text"
    | "number"
    | "email"
    | "phone"
    | "date"
    | "dropdown"
    | "checkbox"
    | "textarea"
    | "url";

export interface ICustomField extends Document {
    educatorId: mongoose.Types.ObjectId;
    key: string;           // slug key, e.g. "lead_stage"
    label: string;         // display name, e.g. "Lead Stage"
    type: CustomFieldType;
    options?: string[];    // for dropdown type
    isRequired: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const CustomFieldSchema = new Schema<ICustomField>(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        key: { type: String, required: true },
        label: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: ["text", "number", "email", "phone", "date", "dropdown", "checkbox", "textarea", "url"],
            default: "text",
        },
        options: [{ type: String }],
        isRequired: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Unique key per educator
CustomFieldSchema.index({ educatorId: 1, key: 1 }, { unique: true });

export default mongoose.models.CustomField ||
    mongoose.model<ICustomField>("CustomField", CustomFieldSchema);
