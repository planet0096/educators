import mongoose, { Schema, Document } from "mongoose";

export interface ICampaignMessage extends Document {
    campaignId: mongoose.Types.ObjectId;
    contactId: mongoose.Types.ObjectId;
    phone: string;
    // The fully formed WhatsApp components array for this specific user
    components: any[];
    status: "pending" | "sent" | "failed";
    errorMessage?: string;
    messageId?: string; // ID returned by Meta upon success
    createdAt: Date;
    updatedAt: Date;
}

const CampaignMessageSchema = new Schema<ICampaignMessage>(
    {
        campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
        contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
        phone: { type: String, required: true },
        components: [{ type: Schema.Types.Mixed }],
        status: {
            type: String,
            enum: ["pending", "sent", "failed"],
            default: "pending"
        },
        errorMessage: { type: String },
        messageId: { type: String }
    },
    { timestamps: true }
);

// Indexes
// 1. Used by the queue processor to quickly find pending messages for a specific campaign
CampaignMessageSchema.index({ campaignId: 1, status: 1 });

// 2. Used by the UI when fetching messages for an individual contact or overall campaign status
CampaignMessageSchema.index({ contactId: 1 });

export default mongoose.models.CampaignMessage ||
    mongoose.model<ICampaignMessage>("CampaignMessage", CampaignMessageSchema);
