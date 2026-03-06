import mongoose, { Schema, Document } from "mongoose";

export interface IContactList extends Document {
    educatorId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ContactListSchema = new Schema<IContactList>(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        description: { type: String },
    },
    { timestamps: true }
);

// Compound index to ensure list names are unique per educator
ContactListSchema.index({ educatorId: 1, name: 1 }, { unique: true });

export default mongoose.models.ContactList ||
    mongoose.model<IContactList>("ContactList", ContactListSchema);
