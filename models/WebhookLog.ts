import mongoose, { Schema, Document } from "mongoose";

export interface IWebhookLog extends Document {
    payload: any;
    error: string;
    createdAt: Date;
}

const WebhookLogSchema: Schema = new Schema(
    {
        payload: { type: Schema.Types.Mixed },
        error: { type: String, default: "" },
    },
    { timestamps: true }
);

export default mongoose.models.WebhookLog || mongoose.model<IWebhookLog>("WebhookLog", WebhookLogSchema);
