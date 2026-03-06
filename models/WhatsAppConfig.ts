import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppConfig extends Document {
    user: mongoose.Types.ObjectId;
    appId: string;
    phoneNumberId: string;
    accessToken: string;
    wabaId: string;
    createdAt: Date;
    updatedAt: Date;
}

const WhatsAppConfigSchema: Schema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        appId: { type: String, required: true },
        phoneNumberId: { type: String, required: true },
        accessToken: { type: String, required: true },
        wabaId: { type: String, required: true },
    },
    { timestamps: true }
);

if (mongoose.models.WhatsAppConfig) {
    delete mongoose.models.WhatsAppConfig;
}

export default mongoose.model<IWhatsAppConfig>("WhatsAppConfig", WhatsAppConfigSchema);
