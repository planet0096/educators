import mongoose, { Schema, Document } from "mongoose";

export interface IAutomationSession extends Document {
    educatorId: mongoose.Types.ObjectId;
    contactPhone: string;
    flowId?: mongoose.Types.ObjectId; // Optional: lock sessions exist without an active flow
    currentNodeId?: string;
    state: Record<string, any>;
    status: "active" | "completed" | "failed";
    expiresAt?: Date;
    // Mutex Lock fields (used by chatbotEngine acquireLock / releaseLock)
    engineLocked?: boolean;
    lockedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AutomationSessionSchema: Schema = new Schema(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        contactPhone: { type: String, required: true },
        flowId: { type: Schema.Types.ObjectId, ref: "AutomationFlow" }, // Not required for lock-only records
        currentNodeId: { type: String },
        state: { type: Schema.Types.Mixed, default: {} },
        status: {
            type: String,
            enum: ["active", "completed", "failed"],
            default: "active"
        },
        expiresAt: { type: Date },
        // Mutex Lock
        engineLocked: { type: Boolean, default: false },
        lockedAt: { type: Date }
    },
    { timestamps: true }
);

// Compound index to speed up lock acquisition query: { educatorId, contactPhone, engineLocked }
AutomationSessionSchema.index({ educatorId: 1, contactPhone: 1, engineLocked: 1 });
// Speed up active session lookup
AutomationSessionSchema.index({ educatorId: 1, contactPhone: 1, status: 1 });

export default mongoose.models.AutomationSession ||
    mongoose.model<IAutomationSession>("AutomationSession", AutomationSessionSchema);
