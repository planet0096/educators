import { notFound } from "next/navigation";
import { Briefcase, GraduationCap, MapPin, User, UserPlus, Youtube, ListVideo } from "lucide-react";
import dbConnect from "@/lib/db";
import Profile from "@/models/Profile";
import mongoose from "mongoose";
import RequestCallButton from "./RequestCallButton";

export default async function EducatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return notFound();
    }

    let profile;
    try {
        // Find profile by profile _id
        profile = await Profile.findById(id).lean();
    } catch (e) {
        // Invalid ObjectId
        return notFound();
    }

    if (!profile) {
        return notFound();
    }

    const { firstName, lastName, headline, location, skills, experience, education, bio, youtubeVideoUrl, programs } = profile as any;

    // Helper to extract YouTube video ID and create embed URL
    const getYouTubeEmbedUrl = (url: string) => {
        if (!url) return null;
        try {
            let videoId = "";
            if (url.includes("youtu.be/")) {
                videoId = url.split("youtu.be/")[1]?.split("?")[0];
            } else if (url.includes("youtube.com/watch?v=")) {
                videoId = url.split("v=")[1]?.split("&")[0];
            } else if (url.includes("youtube.com/embed/")) {
                return url; // Already an embed URL
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        } catch {
            return null;
        }
    };

    const embedUrl = youtubeVideoUrl ? getYouTubeEmbedUrl(youtubeVideoUrl) : null;

    return (
        <div className="max-w-4xl mx-auto px-4 pt-10 pb-20">
            {/* Profile Hero Section */}
            <div className="bg-white border border-zinc-200 rounded-[2rem] shadow-sm overflow-hidden mb-10 relative">
                {/* Cover Photo / Header background */}
                <div className="h-40 md:h-56 bg-gradient-to-br from-indigo-100 via-white to-rose-100 w-full relative">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.15] mix-blend-overlay pointer-events-none"></div>
                </div>

                <div className="px-6 md:px-10 pb-10">
                    {/* Avatar */}
                    <div className="-mt-16 md:-mt-20 mb-5 md:mb-6 h-32 w-32 md:h-40 md:w-40 rounded-3xl bg-white p-1.5 shadow-xl ring-1 ring-zinc-900/5 flex items-center justify-center relative z-10 overflow-hidden">
                        <div className="w-full h-full bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100">
                            <User className="w-16 h-16 text-zinc-300" />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900">
                                {firstName} {lastName}
                            </h1>
                            <p className="text-lg text-zinc-600 mt-1.5 font-medium">{headline}</p>

                            {(location?.city || location?.country) && (
                                <div className="flex items-center gap-1.5 mt-4 text-zinc-500 text-sm font-medium">
                                    <MapPin className="w-4 h-4 text-zinc-400" />
                                    <span>{[location.city, location.country].filter(Boolean).join(", ")}</span>
                                </div>
                            )}
                        </div>

                        {/* CTAs */}
                        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 relative z-20">
                            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-900 text-white px-7 py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm">
                                <UserPlus className="w-4 h-4" />
                                Follow
                            </button>
                            <RequestCallButton educatorId={profile.user.toString()} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column (Wider on MD and up) */}
                <div className="md:col-span-2 space-y-8">
                    {/* About Section */}
                    {bio && (
                        <div className="bg-white border border-zinc-200/80 rounded-[2rem] shadow-sm p-7 md:p-10">
                            <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-5">About</h2>
                            <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap text-[15px]">
                                {bio}
                            </p>
                        </div>
                    )}

                    {/* Experience Section */}
                    {experience && experience.length > 0 && (
                        <div className="bg-white border border-zinc-200/80 rounded-[2rem] shadow-sm p-7 md:p-10">
                            <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-8 flex items-center gap-2.5">
                                <span className="bg-zinc-100 p-2 rounded-xl text-zinc-600"><Briefcase className="w-5 h-5" /></span>
                                Experience
                            </h2>
                            <div className="space-y-0 relative">
                                {/* Timeline line */}
                                <div className="absolute left-6 top-10 bottom-10 w-px bg-zinc-200 hidden sm:block"></div>

                                {experience.map((exp: any, index: number) => (
                                    <div key={index} className="flex gap-4 md:gap-6 relative pb-10 last:pb-0">
                                        <div className="flex-shrink-0 z-10 w-12 pt-1 hidden sm:flex justify-center bg-white">
                                            <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm relative">
                                                <Briefcase className="w-5 h-5 text-zinc-400" />
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 z-10 sm:hidden">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm">
                                                <Briefcase className="w-4 h-4 text-zinc-400" />
                                            </div>
                                        </div>
                                        <div className="pt-1.5 pb-2">
                                            <h3 className="font-semibold text-lg text-zinc-900 tracking-tight">{exp.title}</h3>
                                            <p className="text-zinc-700 font-medium text-[15px]">{exp.company}</p>
                                            <p className="text-zinc-500 text-sm mt-1.5 font-medium">
                                                {exp.startDate ? new Date(exp.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown'}
                                                {' '}—{' '}
                                                {exp.current ? 'Present' : (exp.endDate ? new Date(exp.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Education Section */}
                    {education && education.length > 0 && (
                        <div className="bg-white border border-zinc-200/80 rounded-[2rem] shadow-sm p-7 md:p-10">
                            <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-8 flex items-center gap-2.5">
                                <span className="bg-zinc-100 p-2 rounded-xl text-zinc-600"><GraduationCap className="w-5 h-5" /></span>
                                Education
                            </h2>
                            <div className="space-y-0 relative">
                                {/* Timeline line */}
                                <div className="absolute left-6 top-10 bottom-10 w-px bg-zinc-200 hidden sm:block"></div>

                                {education.map((edu: any, index: number) => (
                                    <div key={index} className="flex gap-4 md:gap-6 relative pb-10 last:pb-0">
                                        <div className="flex-shrink-0 z-10 w-12 pt-1 hidden sm:flex justify-center bg-white">
                                            <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm relative">
                                                <GraduationCap className="w-5 h-5 text-zinc-400" />
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 z-10 sm:hidden">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm">
                                                <GraduationCap className="w-4 h-4 text-zinc-400" />
                                            </div>
                                        </div>
                                        <div className="pt-1.5 pb-2">
                                            <h3 className="font-semibold text-lg text-zinc-900 tracking-tight">{edu.school}</h3>
                                            <p className="text-zinc-700 font-medium text-[15px]">{edu.degree}</p>
                                            <p className="text-zinc-500 text-sm mt-1.5 font-medium">
                                                {edu.startDate ? new Date(edu.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown'}
                                                {' '}—{' '}
                                                {edu.endDate ? new Date(edu.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Present'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Programs & Courses Section */}
                    {programs && programs.length > 0 && (
                        <div className="bg-white border border-zinc-200/80 rounded-[2rem] shadow-sm p-7 md:p-10">
                            <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-8 flex items-center gap-2.5">
                                <span className="bg-zinc-100 p-2 rounded-xl text-zinc-600"><ListVideo className="w-5 h-5" /></span>
                                Programs & Courses
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {programs.map((program: any, index: number) => (
                                    <div key={index} className="p-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 transition-colors group">
                                        <h3 className="font-semibold text-lg text-zinc-900 tracking-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{program.name}</h3>
                                        <div className="flex items-center gap-3 text-sm font-medium mb-3">
                                            <span className="text-zinc-900 bg-zinc-200/60 px-2.5 py-1 rounded-md">{program.fee}</span>
                                            <span className="text-zinc-500 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-zinc-300"></span>{program.duration}</span>
                                        </div>
                                        {program.description && (
                                            <p className="text-zinc-600 text-[15px] leading-snug line-clamp-3">{program.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column (Narrower on MD and up) */}
                <div className="space-y-8">
                    {/* Featured Video (Moved to top of right column if available) */}
                    {embedUrl && (
                        <div className="bg-white border border-zinc-200/80 rounded-[2rem] shadow-sm p-5 md:p-7">
                            <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-5 flex items-center gap-2.5">
                                <Youtube className="w-6 h-6 text-red-500" />
                                Featured Video
                            </h2>
                            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-sm bg-zinc-100">
                                <iframe
                                    src={embedUrl}
                                    title={`${firstName}'s Introduction`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full border-0"
                                ></iframe>
                            </div>
                        </div>
                    )}

                    {/* Skills Section */}
                    <div className="bg-white border border-zinc-200/80 rounded-[2rem] shadow-sm p-7">
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-5">Skills</h2>
                        {skills && skills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill: string, index: number) => (
                                    <span key={index} className="px-3 py-1.5 bg-zinc-50 border border-zinc-200/80 text-zinc-700 text-sm rounded-lg font-medium shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors hover:bg-zinc-100 hover:border-zinc-300">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-zinc-500 text-sm">No skills listed.</p>
                        )}
                    </div>

                    {/* Contact/Share quick widget */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-lg p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

                        <div className="w-14 h-14 bg-zinc-800/80 ring-1 ring-white/10 text-zinc-300 rounded-full flex items-center justify-center mx-auto mb-5 relative z-10">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-lg text-white mb-2 relative z-10">Grow Your Network</h3>
                        <p className="text-[15px] text-zinc-400 mb-6 relative z-10">Connect with {firstName} to collaborate and share educational resources.</p>
                        <button className="w-full bg-white text-zinc-900 rounded-xl py-3 font-medium hover:bg-zinc-100 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 relative z-10 tracking-tight">
                            Connect Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
