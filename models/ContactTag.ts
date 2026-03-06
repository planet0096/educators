import mongoose, { Schema, Document } from "mongoose";

export interface IContactTag extends Document {
    educatorId: mongoose.Types.ObjectId;
    name: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
}

const ContactTagSchema = new Schema<IContactTag>(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        color: { type: String, default: "#E5E7EB" }, // Default to a light gray tailwind color
    },
    { timestamps: true }
);

// Compound index to ensure tag names are unique per educator
ContactTagSchema.index({ educatorId: 1, name: 1 }, { unique: true });

export default mongoose.models.ContactTag ||
    mongoose.model<IContactTag>("ContactTag", ContactTagSchema);
