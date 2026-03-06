import mongoose, { Schema, Document } from "mongoose";

export interface IProgram {
    name: string;
    fee: string;
    duration: string;
    description?: string;
}

export interface IExperience {
    title: string;
    company: string;
    location?: string;
    startDate: Date;
    endDate?: Date;
    current: boolean;
    description?: string;
}

export interface IEducation {
    school: string;
    degree: string;
    fieldOfStudy?: string;
    startDate: Date;
    endDate?: Date;
}

export interface IProfile extends Document {
    user: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    headline: string;
    location: {
        city?: string;
        country?: string;
    };
    experience: IExperience[];
    education: IEducation[];
    skills: string[];
    bio?: string;
    avatarUrl?: string;
    phoneNumber?: string;
    targetExam?: string;
    examDate?: Date;
    youtubeVideoUrl?: string;
    programs?: IProgram[];
    createdAt: Date;
    updatedAt: Date;
}

const ExperienceSchema = new Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: String,
    startDate: { type: Date, required: true },
    endDate: Date,
    current: { type: Boolean, default: false },
    description: String,
});

const EducationSchema = new Schema({
    school: { type: String, required: true },
    degree: { type: String, required: true },
    fieldOfStudy: String,
    startDate: { type: Date, required: true },
    endDate: Date,
});

const ProgramSchema = new Schema({
    name: { type: String, required: true },
    fee: { type: String, required: true },
    duration: { type: String, required: true },
    description: String,
});

const ProfileSchema: Schema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        headline: { type: String, required: true },
        location: {
            city: String,
            country: String,
        },
        experience: [ExperienceSchema],
        education: [EducationSchema],
        skills: [String],
        bio: String,
        avatarUrl: String,
        phoneNumber: String,
        targetExam: String,
        examDate: Date,
        youtubeVideoUrl: String,
        programs: [ProgramSchema],
    },
    { timestamps: true }
);

export default mongoose.models.Profile || mongoose.model<IProfile>("Profile", ProfileSchema);
