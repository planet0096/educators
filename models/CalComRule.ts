import mongoose, { Schema, Document } from "mongoose";

export interface ICalComRule extends Document {
    educatorId: mongoose.Types.ObjectId;
    name: string;
    triggerType: "calcom_booking_created" | "calcom_booking_cancelled" | "calcom_booking_rescheduled";
    isActive: boolean;
    templateName: string;
    languageCode: string;
    // Each entry: { param: "{{1}}", variable: "{{invitee_name}}" }
    variableMappings: { param: string; variable: string }[];
    createdAt: Date;
    updatedAt: Date;
}

const CalComRuleSchema: Schema = new Schema(
    {
        educatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        triggerType: {
            type: String,
            enum: ["calcom_booking_created", "calcom_booking_cancelled", "calcom_booking_rescheduled"],
            required: true,
        },
        isActive: { type: Boolean, default: true },
        templateName: { type: String, required: true },
        languageCode: { type: String, default: "en_US" },
        variableMappings: [
            {
                param: String,
                variable: String,
            },
        ],
    },
    { timestamps: true }
);

CalComRuleSchema.index({ educatorId: 1, triggerType: 1, isActive: 1 });

export default mongoose.models.CalComRule ||
    mongoose.model<ICalComRule>("CalComRule", CalComRuleSchema);
