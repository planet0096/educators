import mongoose, { Schema, Document } from "mongoose";

export interface ICampaign extends Document {
    educatorId: mongoose.Types.ObjectId;
    name: string;
    templateName: string;
    templateLanguage: string;
    status: "pending" | "running" | "completed" | "failed";
    totalContacts: number;
    successfulSends: number;
    failedSends: number;
    createdAt: Date;
    updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        templateName: { type: String, required: true },
        templateLanguage: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "running", "completed", "failed"],
            default: "pending"
        },
        totalContacts: { type: Number, default: 0 },
        successfulSends: { type: Number, default: 0 },
        failedSends: { type: Number, default: 0 }
    },
    { timestamps: true }
);

// Index for fetching an educator's campaigns sorted by creation date
CampaignSchema.index({ educatorId: 1, createdAt: -1 });

export default mongoose.models.Campaign ||
    mongoose.model<ICampaign>("Campaign", CampaignSchema);
