"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ArrowRight, ArrowLeft, Plus, Trash2, CheckCircle2 } from "lucide-react";

// --- Schema Definitions ---
const experienceSchema = z.object({
    title: z.string().min(2, "Title is required"),
    company: z.string().min(2, "Company is required"),
    location: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    description: z.string().optional(),
});

const educationSchema = z.object({
    school: z.string().min(2, "School is required"),
    degree: z.string().min(2, "Degree is required"),
    fieldOfStudy: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
});

const profileSchema = z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    headline: z.string().min(10, "Headline must be at least 10 characters").optional().or(z.literal("")),
    location: z.object({
        city: z.string().optional(),
        country: z.string().optional(),
    }),
    phoneNumber: z.string().optional(),
    targetExam: z.string().optional(),
    examDate: z.string().optional(),
    experience: z.array(experienceSchema).optional(),
    education: z.array(educationSchema).optional(),
    skills: z.string().optional(),
    bio: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const EDUCATOR_STEPS = [
    { id: 1, title: "Basic Info" },
    { id: 2, title: "Experience" },
    { id: 3, title: "Education" },
    { id: 4, title: "Skills & Bio" },
];

const STUDENT_STEPS = [
    { id: 1, title: "Basic Info" },
    { id: 2, title: "Learning Goals" },
    { id: 3, title: "Education" },
];

export default function OnboardingForm() {
    const router = useRouter();
    const { data: session } = useSession();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const role = (session?.user as any)?.role || "educator";
    const isStudent = role === "student";
    const STEPS = isStudent ? STUDENT_STEPS : EDUCATOR_STEPS;

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            location: { city: "", country: "" },
            experience: [],
            education: [],
            skills: "",
        },
        mode: "onChange",
    });

    const { control, handleSubmit, register, formState: { errors }, trigger } = form;

    const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({ control, name: "experience" });
    const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control, name: "education" });

    const nextStep = async () => {
        let fieldsToValidate: any[] = [];

        if (isStudent) {
            if (currentStep === 1) fieldsToValidate = ["firstName", "lastName", "phoneNumber", "location.city", "location.country"];
            if (currentStep === 2) fieldsToValidate = ["targetExam", "examDate"];
            if (currentStep === 3) fieldsToValidate = ["education"];
        } else {
            if (currentStep === 1) fieldsToValidate = ["firstName", "lastName", "headline", "location.city", "location.country"];
            if (currentStep === 2) fieldsToValidate = ["experience"];
            if (currentStep === 3) fieldsToValidate = ["education"];
            if (currentStep === 4) fieldsToValidate = ["skills", "bio"];
        }

        const isStepValid = await trigger(fieldsToValidate);
        if (isStepValid) {
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
        }
    };

    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const onSubmit = async (data: ProfileFormValues) => {
        setIsSubmitting(true);
        setError("");

        try {
            // Process skills into array if present
            const skillsArray = data.skills ? data.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];

            const payload = {
                ...data,
                skills: skillsArray,
            };

            const res = await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error("Failed to save profile");
            }

            // Profile saved, redirect to dashboard
            router.push("/dashboard");
            router.refresh();

        } catch (err: any) {
            setError(err.message || "An error occurred");
            setIsSubmitting(false);
        }
    };

    // --- Render Helpers ---

    const renderStepIndicator = () => (
        <div className="flex justify-between items-center mb-10 relative">
            <div className="absolute left-0 top-1/2 -z-10 h-0.5 w-full bg-slate-800 -translate-y-1/2"></div>
            <div
                className="absolute left-0 top-1/2 -z-10 h-0.5 bg-blue-500 -translate-y-1/2 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            ></div>

            {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;

                return (
                    <div key={step.id} className="flex flex-col items-center">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${isActive
                                ? "bg-zinc-900 border-2 border-white text-white shadow-md"
                                : isCompleted
                                    ? "bg-zinc-900 border border-zinc-900 text-white"
                                    : "bg-zinc-100 border border-zinc-300 text-zinc-500"
                                }`}
                        >
                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.id}
                        </div>
                        <span className={`mt-2 text-xs font-medium absolute translate-y-12 ${isActive ? "text-zinc-900" : "text-zinc-500"}`}>
                            {step.title}
                        </span>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="w-full max-w-3xl bg-white border border-zinc-200/50 rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {renderStepIndicator()}
            <div className="h-6" /> {/* spacer */}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 relative min-h-[400px]">
                <AnimatePresence mode="wait">

                    {/* STEP 1: Basic Info */}
                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-zinc-700">First Name</label>
                                    <input {...register("firstName")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 focus:bg-white transition-all duration-200" placeholder={isStudent ? "John" : "Jane"} />
                                    {errors.firstName && <span className="text-red-400 text-xs">{errors.firstName.message}</span>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-zinc-700">Last Name</label>
                                    <input {...register("lastName")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 focus:bg-white transition-all duration-200" placeholder="Doe" />
                                    {errors.lastName && <span className="text-red-400 text-xs">{errors.lastName.message}</span>}
                                </div>
                            </div>

                            {!isStudent && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-zinc-700">Professional Headline</label>
                                    <input {...register("headline")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 focus:bg-white transition-all duration-200" placeholder="e.g. High School Science Teacher | Curriculum Developer" />
                                    {errors.headline && <span className="text-red-400 text-xs">{errors.headline.message}</span>}
                                </div>
                            )}

                            {isStudent && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-zinc-700">Phone Number (Optional)</label>
                                    <input {...register("phoneNumber")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 focus:bg-white transition-all duration-200" placeholder="+1 (555) 000-0000" />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-zinc-700">City</label>
                                    <input {...register("location.city")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 focus:bg-white transition-all duration-200" placeholder="New York" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-zinc-700">Country</label>
                                    <input {...register("location.country")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 focus:bg-white transition-all duration-200" placeholder="USA" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* EDUCATOR STEP 2: Experience */}
                    {!isStudent && currentStep === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-semibold">Experience</h2>
                                <button type="button" onClick={() => appendExp({ title: "", company: "", startDate: "", current: false })} className="text-zinc-900 font-medium text-sm flex items-center gap-1 hover:text-zinc-700 transition-colors">
                                    <Plus className="w-4 h-4" /> Add Role
                                </button>
                            </div>

                            {expFields.length === 0 && (
                                <div className="text-center py-10 border border-dashed border-zinc-300 rounded-xl text-zinc-500">
                                    No experience added yet. Click "Add Role" to begin.
                                </div>
                            )}

                            {expFields.map((field, index) => (
                                <div key={field.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 relative">
                                    <button type="button" onClick={() => removeExp(index)} className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-700">Title / Role</label>
                                            <input {...register(`experience.${index}.title`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-700">School / Company</label>
                                            <input {...register(`experience.${index}.company`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-700">Start Date</label>
                                            <input type="month" {...register(`experience.${index}.startDate`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-700">End Date</label>
                                            <input type="month" {...register(`experience.${index}.endDate`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* STUDENT STEP 2: Learning Goals */}
                    {isStudent && currentStep === 2 && (
                        <motion.div
                            key="step2-stu"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <h2 className="text-2xl font-semibold mb-6">Learning Goals</h2>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-zinc-700">Target Exam / Subject</label>
                                <input {...register("targetExam")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 focus:bg-white transition-all duration-200" placeholder="e.g. IELTS, SAT, IB Mathematics" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-zinc-700">Expected Exam Date (Optional)</label>
                                <input type="month" {...register("examDate")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 focus:bg-white transition-all duration-200" />
                            </div>
                        </motion.div>
                    )}

                    {/* COMMON STEP 3: Education */}
                    {currentStep === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-semibold">Education</h2>
                                <button type="button" onClick={() => appendEdu({ school: "", degree: "", startDate: "" })} className="text-zinc-900 font-medium text-sm flex items-center gap-1 hover:text-zinc-700 transition-colors">
                                    <Plus className="w-4 h-4" /> Add Education
                                </button>
                            </div>

                            {eduFields.length === 0 && (
                                <div className="text-center py-10 border border-dashed border-zinc-300 rounded-xl text-zinc-500">
                                    No education added yet. Click "Add Education" to begin.
                                </div>
                            )}

                            {eduFields.map((field, index) => (
                                <div key={field.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 relative">
                                    <button type="button" onClick={() => removeEdu(index)} className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-700">Institution / School</label>
                                            <input {...register(`education.${index}.school`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-700">Degree / Grade</label>
                                            <input {...register(`education.${index}.degree`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" placeholder={isStudent ? "e.g. High School Senior" : ""} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-700">Start Date</label>
                                            <input type="month" {...register(`education.${index}.startDate`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-700">End Date</label>
                                            <input type="month" {...register(`education.${index}.endDate`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* EDUCATOR STEP 4: Skills & Bio */}
                    {!isStudent && currentStep === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <h2 className="text-2xl font-semibold mb-6">Skills & Bio</h2>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-zinc-700">Skills (comma separated)</label>
                                <input {...register("skills")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 focus:bg-white transition-all duration-200" placeholder="e.g. Lesson Planning, Special Education, STEM" />
                                {errors.skills && <span className="text-red-400 text-xs">{errors.skills.message}</span>}
                            </div>

                            <div className="space-y-1.5 ">
                                <label className="text-sm font-medium text-zinc-700">About You (Bio)</label>
                                <textarea {...register("bio")} rows={5} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 focus:bg-white transition-all duration-200 resize-none" placeholder="Share a brief overview of your professional journey..." />
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center font-medium">
                        {error}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between mt-10 border-t border-zinc-200 pt-6 absolute bottom-[-80px] w-full">
                    <button
                        type="button"
                        onClick={prevStep}
                        disabled={currentStep === 1 || isSubmitting}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${currentStep === 1 ? "opacity-0 cursor-default" : "bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 shadow-sm"
                            }`}
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    {currentStep < STEPS.length ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="flex items-center gap-2 bg-zinc-900 text-white px-8 py-2.5 rounded-xl font-medium hover:bg-zinc-800 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/20 shadow-sm shadow-zinc-900/10 transition-all"
                        >
                            Continue <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 bg-zinc-900 text-white px-8 py-2.5 rounded-xl font-medium hover:bg-zinc-800 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/20 shadow-sm shadow-zinc-900/10 disabled:opacity-50 transition-all"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-zinc-300" /> : "Complete Profile"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
