"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, Trash2, User, Briefcase, GraduationCap, Settings2, Save, ArrowLeft, Youtube, ListVideo } from "lucide-react";
import Link from "next/link";

// Reuse identical schema from Onboarding
const profileSchema = z.object({
    firstName: z.string().min(2, "First name is too short"),
    lastName: z.string().min(2, "Last name is too short"),
    headline: z.string().optional(),
    location: z.object({
        city: z.string().optional(),
        country: z.string().optional(),
    }),
    experience: z.array(
        z.object({
            title: z.string().min(2, "Title is required"),
            company: z.string().min(2, "Company is required"),
            startDate: z.string(),
            endDate: z.string().optional(),
            current: z.boolean().optional(),
        })
    ).optional(),
    education: z.array(
        z.object({
            school: z.string().min(2, "School is required"),
            degree: z.string().min(2, "Degree is required"),
            startDate: z.string(),
            endDate: z.string().optional(),
        })
    ).optional(),
    skills: z.string().optional(), // We'll manage it as a comma-separated string in the form
    bio: z.string().optional(),
    youtubeVideoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    programs: z.array(
        z.object({
            name: z.string().min(2, "Program name is required"),
            fee: z.string().min(1, "Fee is required"),
            duration: z.string().min(1, "Duration is required"),
            description: z.string().optional(),
        })
    ).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type Tab = "basic" | "experience" | "education" | "about" | "programs";

export default function ProfileEditClient({ initialData }: { initialData: any }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>("basic");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Convert array of skills back to a comma-separated string for the input field
    const initialSkillsString = Array.isArray(initialData?.skills)
        ? initialData.skills.join(", ")
        : initialData?.skills || "";

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: initialData?.firstName || "",
            lastName: initialData?.lastName || "",
            headline: initialData?.headline || "",
            location: {
                city: initialData?.location?.city || "",
                country: initialData?.location?.country || "",
            },
            experience: (initialData?.experience || []).map((exp: any) => ({
                title: exp.title || "",
                company: exp.company || "",
                startDate: exp.startDate || "",
                endDate: exp.endDate,
                current: Boolean(exp.current),
            })),
            education: (initialData?.education || []).map((edu: any) => ({
                school: edu.school || "",
                degree: edu.degree || "",
                startDate: edu.startDate || "",
                endDate: edu.endDate,
            })),
            skills: initialSkillsString,
            bio: initialData?.bio || "",
            youtubeVideoUrl: initialData?.youtubeVideoUrl || "",
            programs: (initialData?.programs || []).map((prog: any) => ({
                name: prog.name || "",
                fee: prog.fee || "",
                duration: prog.duration || "",
                description: prog.description || "",
            })),
        },
    });

    const { control, handleSubmit, register, formState: { errors } } = form;

    const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({ control, name: "experience" });
    const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control, name: "education" });
    const { fields: progFields, append: appendProg, remove: removeProg } = useFieldArray({ control, name: "programs" });

    const onSubmit = async (data: ProfileFormValues) => {
        setIsSubmitting(true);
        setError("");
        setSuccessMsg("");

        try {
            // Process skills string back into an array
            const skillsArray = data.skills
                ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

            const payload = {
                ...data,
                skills: skillsArray,
            };

            console.log("SENDING TO API:", payload);

            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to update profile");
            }

            setSuccessMsg("Profile updated successfully!");
            router.refresh();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMsg(""), 3000);

        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        { id: "basic", label: "Basic Info", icon: User },
        { id: "programs", label: "Programs", icon: ListVideo },
        { id: "about", label: "About & Video", icon: Settings2 },
        { id: "experience", label: "Experience", icon: Briefcase },
        { id: "education", label: "Education", icon: GraduationCap },
    ] as const;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="gap-8 grid grid-cols-1 md:grid-cols-4">

            {/* Sidebar Navigation */}
            <div className="md:col-span-1 space-y-2">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-6 text-sm font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>

                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-3">
                    <nav className="flex flex-col space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${isActive
                                        ? "bg-zinc-100 text-zinc-900"
                                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? "text-zinc-900" : "text-zinc-400"}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="bg-zinc-100/50 border border-zinc-200 rounded-2xl p-4 mt-4 hidden md:block">
                    <p className="text-xs text-zinc-500 text-center">
                        Keep your profile up to date to discover the best opportunities and peers in the Educators network.
                    </p>
                </div>
            </div>

            {/* Main Form Area */}
            <div className="md:col-span-3 bg-white border border-zinc-200/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center justify-center">
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-medium flex items-center justify-center">
                        {successMsg}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* BASIC INFO TAB */}
                    {activeTab === "basic" && (
                        <motion.div
                            key="basic"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <h2 className="text-xl font-semibold text-zinc-900 border-b border-zinc-100 pb-4">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-zinc-700">First Name</label>
                                    <input {...register("firstName")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-2.5 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                    {errors.firstName && <span className="text-red-500 text-xs">{errors.firstName.message as string}</span>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-zinc-700">Last Name</label>
                                    <input {...register("lastName")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-2.5 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                    {errors.lastName && <span className="text-red-500 text-xs">{errors.lastName.message as string}</span>}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-zinc-700">Professional Headline</label>
                                <input {...register("headline")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-2.5 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-zinc-700">City</label>
                                    <input {...register("location.city")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-2.5 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-zinc-700">Country</label>
                                    <input {...register("location.country")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-2.5 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ABOUT & VIDEO TAB */}
                    {activeTab === "about" && (
                        <motion.div
                            key="about"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <h2 className="text-xl font-semibold text-zinc-900 border-b border-zinc-100 pb-4">About You & Media</h2>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-zinc-700">Skills (comma separated)</label>
                                <input {...register("skills")} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-2.5 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" placeholder="e.g. Lesson Planning, STEM, Special Education" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-zinc-700">Bio</label>
                                <textarea {...register("bio")} rows={6} className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-3 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 resize-none" placeholder="Share a brief overview of your professional journey..." />
                            </div>

                            {/* Video Section Moved Here */}
                            <div className="pt-4 border-t border-zinc-100">
                                <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                                    <Youtube className="w-5 h-5 text-red-500" />
                                    Featured Video
                                </h3>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-zinc-700">YouTube Video Link</label>
                                    <input {...register("youtubeVideoUrl")} placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl py-2.5 px-3 text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                    {errors.youtubeVideoUrl && <span className="text-red-500 text-xs">{errors.youtubeVideoUrl.message as string}</span>}
                                    <p className="text-xs text-zinc-500 mt-1">Add an introductory video to showcase your teaching style.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}


                    {/* EXPERIENCE TAB */}
                    {activeTab === "experience" && (
                        <motion.div
                            key="experience"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
                                <h2 className="text-xl font-semibold text-zinc-900">Experience</h2>
                                <button type="button" onClick={() => appendExp({ title: "", company: "", startDate: "", current: false })} className="text-zinc-900 font-medium text-sm flex items-center gap-1 hover:text-zinc-700 bg-zinc-100 px-3 py-1.5 rounded-lg transition-colors">
                                    <Plus className="w-4 h-4" /> Add Role
                                </button>
                            </div>

                            {expFields.length === 0 && (
                                <div className="text-center py-12 border border-dashed border-zinc-300 rounded-xl text-zinc-500 bg-zinc-50/50">
                                    No experience added yet. Click &quot;Add Role&quot; to begin.
                                </div>
                            )}

                            <div className="space-y-4">
                                {expFields.map((field, index) => (
                                    <div key={field.id} className="p-5 bg-zinc-50/80 rounded-2xl border border-zinc-200 relative group">
                                        <button type="button" onClick={() => removeExp(index)} className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-10">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-700">Title / Role</label>
                                                <input {...register(`experience.${index}.title`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-700">School / Company</label>
                                                <input {...register(`experience.${index}.company`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-700">Start Date</label>
                                                <input type="month" {...register(`experience.${index}.startDate`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-700">End Date</label>
                                                <input type="month" {...register(`experience.${index}.endDate`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* EDUCATION TAB */}
                    {activeTab === "education" && (
                        <motion.div
                            key="education"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
                                <h2 className="text-xl font-semibold text-zinc-900">Education</h2>
                                <button type="button" onClick={() => appendEdu({ school: "", degree: "", startDate: "" })} className="text-zinc-900 font-medium text-sm flex items-center gap-1 hover:text-zinc-700 bg-zinc-100 px-3 py-1.5 rounded-lg transition-colors">
                                    <Plus className="w-4 h-4" /> Add Education
                                </button>
                            </div>

                            {eduFields.length === 0 && (
                                <div className="text-center py-12 border border-dashed border-zinc-300 rounded-xl text-zinc-500 bg-zinc-50/50">
                                    No education added yet. Click &quot;Add Education&quot; to begin.
                                </div>
                            )}

                            <div className="space-y-4">
                                {eduFields.map((field, index) => (
                                    <div key={field.id} className="p-5 bg-zinc-50/80 rounded-2xl border border-zinc-200 relative group">
                                        <button type="button" onClick={() => removeEdu(index)} className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-10">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-700">Institution</label>
                                                <input {...register(`education.${index}.school`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-700">Degree</label>
                                                <input {...register(`education.${index}.degree`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-700">Start Date</label>
                                                <input type="month" {...register(`education.${index}.startDate`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-700">End Date</label>
                                                <input type="month" {...register(`education.${index}.endDate`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* PROGRAMS TAB */}
                    {activeTab === "programs" && (
                        <motion.div
                            key="programs"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-8"
                        >
                            {/* Programs Section */}
                            <div>
                                <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5">
                                    <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2.5">
                                        <ListVideo className="w-5 h-5 text-blue-500" />
                                        Programs & Courses
                                    </h2>
                                    <button type="button" onClick={() => appendProg({ name: "", fee: "", duration: "" })} className="text-zinc-900 font-medium text-sm flex items-center gap-1 hover:text-zinc-700 bg-zinc-100 px-3 py-1.5 rounded-lg transition-colors">
                                        <Plus className="w-4 h-4" /> Add Program
                                    </button>
                                </div>

                                {progFields.length === 0 && (
                                    <div className="text-center py-12 border border-dashed border-zinc-300 rounded-xl text-zinc-500 bg-zinc-50/50">
                                        No programs added yet. List your courses, workshops, or 1-on-1 sessions.
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {progFields.map((field, index) => (
                                        <div key={field.id} className="p-5 bg-zinc-50/80 rounded-2xl border border-zinc-200 relative group">
                                            <button type="button" onClick={() => removeProg(index)} className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="space-y-4 pr-10">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-zinc-700">Program Name</label>
                                                    <input {...register(`programs.${index}.name`)} placeholder="e.g. Master IELTS Speaking in 4 Weeks" className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                                    {errors.programs?.[index]?.name && <span className="text-red-500 text-xs">{errors.programs[index]?.name?.message as string}</span>}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-medium text-zinc-700">Fee (e.g. $199)</label>
                                                        <input {...register(`programs.${index}.fee`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                                        {errors.programs?.[index]?.fee && <span className="text-red-500 text-xs">{errors.programs[index]?.fee?.message as string}</span>}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-medium text-zinc-700">Duration (e.g. 4 Weeks)</label>
                                                        <input {...register(`programs.${index}.duration`)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                                        {errors.programs?.[index]?.duration && <span className="text-red-500 text-xs">{errors.programs[index]?.duration?.message as string}</span>}
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-zinc-700">Short Description</label>
                                                    <input {...register(`programs.${index}.description`)} placeholder="What will students learn?" className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Save Button container pinned to the bottom of the active view */}
                <div className="mt-10 border-t border-zinc-100 pt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 bg-zinc-900 text-white px-8 py-2.5 rounded-xl font-medium hover:bg-zinc-800 focus:outline-none focus:ring-[3px] focus:ring-zinc-900/20 shadow-sm shadow-zinc-900/10 disabled:opacity-50 transition-all"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Changes
                    </button>
                </div>
            </div>
        </form>
    );
}
