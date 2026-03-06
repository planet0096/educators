import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    email: string;
    password?: string; // Optional if using OAuth later
    role: "educator" | "student" | "admin";
    onboardingCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        email: { type: String, required: true, unique: true },
        password: { type: String, select: false },
        role: { type: String, enum: ["educator", "student", "admin"], default: "educator" },
        onboardingCompleted: { type: Boolean, default: false },
        walletBalance: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
