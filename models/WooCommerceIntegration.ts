import mongoose, { Schema, Document } from 'mongoose';

export interface WooCommerceTrigger {
    _id: mongoose.Types.ObjectId;
    event: string; // e.g., 'order.created', 'order.updated', 'customer.created'
    templateName: string;
    templateLanguage: string;
    // Maps a template variable (e.g., 'BODY_1') to a WooCommerce payload path (e.g., 'billing.first_name')
    variableMapping: Map<string, string>;
    isActive: boolean;
}

export interface WooCommerceIntegration extends Document {
    educatorId: mongoose.Types.ObjectId;
    webhookSecret: string;
    isEnabled: boolean;
    triggers: WooCommerceTrigger[];
    createdAt: Date;
    updatedAt: Date;
}

const WooCommerceTriggerSchema: Schema = new Schema({
    event: {
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
    variableMapping: {
        type: Map,
        of: String,
        default: {},
    },
    isActive: {
        type: Boolean,
        default: true,
    },
});

const WooCommerceIntegrationSchema: Schema = new Schema(
    {
        educatorId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Educator',
        },
        webhookSecret: {
            type: String,
            required: true,
        },
        isEnabled: {
            type: Boolean,
            default: false,
        },
        triggers: {
            type: [WooCommerceTriggerSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

// Prevent mongoose from recreating the model if it already exists
export default mongoose.models.WooCommerceIntegration || mongoose.model<WooCommerceIntegration>('WooCommerceIntegration', WooCommerceIntegrationSchema);
