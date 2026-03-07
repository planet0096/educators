import mongoose, { Schema, Document } from "mongoose";

export interface IAutomationFlow extends Document {
    educatorId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    isActive: boolean;
    triggerType: "keyword" | "first_contact" | "catch_all";
    keywords?: string[]; // Arrays of keywords to match, empty if triggerType is not 'keyword'
    flowData: any; // Saves the nodes and edges from React Flow
    createdAt: Date;
    updatedAt: Date;
}

const AutomationFlowSchema: Schema = new Schema(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        isActive: { type: Boolean, default: false },
        triggerType: {
            type: String,
            enum: ["keyword", "first_contact", "catch_all"],
            default: "keyword"
        },
        keywords: [{ type: String }],
        flowData: { type: Schema.Types.Mixed, default: { nodes: [], edges: [] } },
    },
    { timestamps: true }
);

AutomationFlowSchema.index({ educatorId: 1, triggerType: 1, isActive: 1 });

export default mongoose.models.AutomationFlow ||
    mongoose.model<IAutomationFlow>("AutomationFlow", AutomationFlowSchema);
