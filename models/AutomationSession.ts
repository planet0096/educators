import mongoose, { Schema, Document } from "mongoose";

export interface IAutomationSession extends Document {
    educatorId: mongoose.Types.ObjectId;
    contactPhone: string;
    flowId: mongoose.Types.ObjectId;
    currentNodeId: string; // The ID of the node they are currently "waiting" at
    state: Record<string, any>; // Arbitrary state/variables accumulated during the flow
    status: "active" | "completed" | "failed";
    expiresAt?: Date; // Optional expiration (e.g. wait for reply for 24h, else break flow)
    createdAt: Date;
    updatedAt: Date;
}

const AutomationSessionSchema: Schema = new Schema(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        contactPhone: { type: String, required: true },
        flowId: { type: Schema.Types.ObjectId, ref: "AutomationFlow", required: true },
        currentNodeId: { type: String, required: true },
        state: { type: Schema.Types.Mixed, default: {} },
        status: {
            type: String,
            enum: ["active", "completed", "failed"],
            default: "active"
        },
        expiresAt: { type: Date }
    },
    { timestamps: true }
);

AutomationSessionSchema.index({ educatorId: 1, contactPhone: 1, status: 1 });

export default mongoose.models.AutomationSession ||
    mongoose.model<IAutomationSession>("AutomationSession", AutomationSessionSchema);
