import mongoose, { Schema, Document } from "mongoose";

export interface ICalComLog extends Document {
    educatorId: mongoose.Types.ObjectId;
    ruleId?: mongoose.Types.ObjectId;
    ruleName: string;
    triggerEvent: string;
    bookingUid: string;
    inviteeName: string;
    inviteePhone: string;
    templateName: string;
    status: "success" | "failed" | "scheduled" | "cancelled";
    errorMessage?: string;
    executedAt: Date;
    scheduledFor?: Date;
    qstashMessageId?: string;
    flowState?: any; // To track where execution paused
    inviteeTimeZone?: string;
}

const CalComLogSchema: Schema = new Schema(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        ruleId: { type: Schema.Types.ObjectId, ref: "CalComRule" },
        ruleName: { type: String },
        triggerEvent: { type: String },
        bookingUid: { type: String },
        inviteeName: { type: String },
        inviteePhone: { type: String },
        templateName: { type: String },
        status: { type: String, enum: ["success", "failed", "scheduled", "cancelled"], required: true },
        errorMessage: { type: String },
        scheduledFor: { type: Date },
        qstashMessageId: { type: String },
        flowState: { type: Schema.Types.Mixed }, // Arbitrary JSON
        inviteeTimeZone: { type: String },
        executedAt: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

CalComLogSchema.index({ educatorId: 1, executedAt: -1 });

export default mongoose.models.CalComLog ||
    mongoose.model<ICalComLog>("CalComLog", CalComLogSchema);
