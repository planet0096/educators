import mongoose, { Schema, Document } from "mongoose";

export interface ICalComWebhookLog extends Document {
    receivedAt: Date;
    triggerEvent: string;
    payload: any;
    processed: boolean;
    errorReason?: string;
}

const CalComWebhookLogSchema: Schema = new Schema(
    {
        receivedAt: { type: Date, default: Date.now },
        triggerEvent: { type: String, required: true },
        payload: { type: Schema.Types.Mixed }, // Store the entire raw JSON payload
        processed: { type: Boolean, default: false },
        errorReason: { type: String },
    },
    { timestamps: false }
);

CalComWebhookLogSchema.index({ receivedAt: -1 });

export default mongoose.models.CalComWebhookLog ||
    mongoose.model<ICalComWebhookLog>("CalComWebhookLog", CalComWebhookLogSchema);
