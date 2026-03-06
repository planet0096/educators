import mongoose, { Schema, Document } from "mongoose";

export interface ILead extends Document {
    educatorId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    status: "pending" | "accepted" | "declined";
    createdAt: Date;
    updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
    {
        educatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "declined"],
            default: "pending",
        },
    },
    {
        timestamps: true,
    }
);

// Prevent a student from creating multiple pending requests for the same educator
LeadSchema.index({ educatorId: 1, studentId: 1 }, { unique: true });

export default mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
