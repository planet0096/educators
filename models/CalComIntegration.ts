import mongoose, { Schema, Document } from "mongoose";

export interface ICalComIntegration extends Document {
    user: mongoose.Types.ObjectId;
    accessToken: string;
    refreshToken: string;
    calComUserId: number;
    calComUsername: string;
    expiry: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CalComIntegrationSchema: Schema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        accessToken: { type: String, required: true },
        refreshToken: { type: String, required: true },
        calComUserId: { type: Number, required: true },
        calComUsername: { type: String, required: true },
        expiry: { type: Date, required: true },
    },
    { timestamps: true }
);

export default mongoose.models.CalComIntegration || mongoose.model<ICalComIntegration>("CalComIntegration", CalComIntegrationSchema);
