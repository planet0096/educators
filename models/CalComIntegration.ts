import mongoose, { Schema, Document } from "mongoose";

export interface ICalComIntegration extends Document {
    user: mongoose.Types.ObjectId;
    apiKey: string;
    calComUserId?: number;
    calComUsername: string;
    createdAt: Date;
    updatedAt: Date;
}

const CalComIntegrationSchema: Schema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        apiKey: { type: String, required: true },
        calComUserId: { type: Number },
        calComUsername: { type: String, default: "Connected" },
    },
    { timestamps: true }
);

export default mongoose.models.CalComIntegration || mongoose.model<ICalComIntegration>("CalComIntegration", CalComIntegrationSchema);
