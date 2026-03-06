import mongoose, { Schema, Document } from 'mongoose';

export interface AutomatedMessage extends Document {
    educatorId: mongoose.Types.ObjectId;
    integration: 'woocommerce';
    triggerId?: mongoose.Types.ObjectId;
    phone: string;
    templateName: string;
    templateLanguage: string;
    templateVariables: Map<string, string>;
    status: 'pending' | 'sent' | 'failed';
    errorMessage?: string;
    messageId?: string; // ID returned by Meta
    payloadTimestamp: Date; // When the webhook was received
    createdAt: Date;
    updatedAt: Date;
}

const AutomatedMessageSchema: Schema = new Schema(
    {
        educatorId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Educator',
        },
        integration: {
            type: String,
            required: true,
            enum: ['woocommerce'],
        },
        triggerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
        },
        phone: {
            type: String,
            required: true,
        },
        templateName: {
            type: String,
            required: true,
        },
        templateLanguage: {
            type: String,
            required: true,
            default: 'en_US',
        },
        templateVariables: {
            type: Map,
            of: String,
            default: {},
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'sent', 'failed'],
            default: 'pending',
        },
        errorMessage: {
            type: String,
            required: false,
        },
        messageId: {
            type: String,
            required: false,
        },
        payloadTimestamp: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent mongoose from recreating the model if it already exists
export default mongoose.models.AutomatedMessage || mongoose.model<AutomatedMessage>('AutomatedMessage', AutomatedMessageSchema);
