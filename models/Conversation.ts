import mongoose, { Schema, Document } from "mongoose";

export interface IConversation extends Document {
    educatorId: mongoose.Types.ObjectId;
    contactPhone: string; // E.164, e.g. "919876543210"
    contactName: string;
    contactProfilePic?: string;
    lastMessage: string;
    lastMessageAt: Date;
    unreadCount: number;
    status: "open" | "archived";
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        contactPhone: { type: String, required: true },
        contactName: { type: String, default: "" },
        contactProfilePic: { type: String },
        lastMessage: { type: String, default: "" },
        lastMessageAt: { type: Date, default: Date.now },
        unreadCount: { type: Number, default: 0 },
        status: { type: String, enum: ["open", "archived"], default: "open" },
    },
    { timestamps: true }
);

// Unique per educator + phone
ConversationSchema.index({ educatorId: 1, contactPhone: 1 }, { unique: true });
ConversationSchema.index({ educatorId: 1, lastMessageAt: -1 });

export default mongoose.models.Conversation ||
    mongoose.model<IConversation>("Conversation", ConversationSchema);
