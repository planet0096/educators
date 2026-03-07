import mongoose, { Schema, Document } from "mongoose";

export type MessageDirection = "inbound" | "outbound";
export type MessageType = "text" | "template" | "image" | "audio" | "video" | "document" | "sticker" | "reaction" | "interactive" | "unknown";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface IChatMessage extends Document {
    educatorId: mongoose.Types.ObjectId;
    conversationId: mongoose.Types.ObjectId;
    wamId: string; // WhatsApp message ID (unique)
    direction: MessageDirection;
    type: MessageType;
    body: string; // text content or caption
    mediaUrl?: string;
    mimeType?: string;
    templateName?: string;
    replyToWamId?: string; // quoted message
    status: MessageStatus;
    timestamp: Date; // from Meta payload (accurate)
    createdAt: Date;
    updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
        wamId: { type: String, required: true, unique: true },
        direction: { type: String, enum: ["inbound", "outbound"], required: true },
        type: { type: String, enum: ["text", "template", "image", "audio", "video", "document", "sticker", "reaction", "interactive", "unknown"], default: "text" },
        body: { type: String, default: "" },
        mediaUrl: { type: String },
        mimeType: { type: String },
        templateName: { type: String },
        replyToWamId: { type: String },
        status: { type: String, enum: ["sent", "delivered", "read", "failed"], default: "sent" },
        timestamp: { type: Date, required: true },
    },
    { timestamps: true }
);

ChatMessageSchema.index({ conversationId: 1, timestamp: 1 });
ChatMessageSchema.index({ wamId: 1 }, { unique: true });

export default mongoose.models.ChatMessage ||
    mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
