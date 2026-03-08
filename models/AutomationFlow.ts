import mongoose, { Schema, Document } from "mongoose";

export interface IAutomationFlow extends Document {
    educatorId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    isActive: boolean;
    source: "chatbot" | "calcom";
    triggerType: "keyword" | "first_contact" | "catch_all" | "calcom_booking_created" | "calcom_booking_cancelled" | "calcom_booking_rescheduled" | "calcom_reminder";
    keywords?: string[];
    calcomEventTypeId?: string;
    flowData: any;
    createdAt: Date;
    updatedAt: Date;
}

const AutomationFlowSchema: Schema = new Schema(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        isActive: { type: Boolean, default: false },
        source: { type: String, enum: ["chatbot", "calcom"], default: "chatbot" },
        triggerType: {
            type: String,
            enum: ["keyword", "first_contact", "catch_all", "calcom_booking_created", "calcom_booking_cancelled", "calcom_booking_rescheduled", "calcom_reminder"],
            default: "keyword"
        },
        keywords: [{ type: String }],
        calcomEventTypeId: { type: String, default: "" },
        flowData: { type: Schema.Types.Mixed, default: { nodes: [], edges: [] } },
    },
    { timestamps: true }
);

AutomationFlowSchema.index({ educatorId: 1, triggerType: 1, isActive: 1 });

export default mongoose.models.AutomationFlow ||
    mongoose.model<IAutomationFlow>("AutomationFlow", AutomationFlowSchema);
