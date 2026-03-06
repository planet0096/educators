import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import dbConnect from "@/lib/db";
import Profile from "@/models/Profile";
import UserModel from "@/models/User";
import { User, MapPin, Briefcase, GraduationCap, CheckCircle2, Zap } from "lucide-react";

export default async function DashboardPage() {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        redirect("/login");
    }

    await dbConnect();

    // Fetch the user's profile and user document
    const [profile, userDoc] = await Promise.all([
        Profile.findOne({ user: session.user.id }).lean(),
        UserModel.findById(session.user.id).select("walletBalance role").lean()
    ]);

    const isEducator = userDoc?.role === "educator";
    const walletBalance = userDoc?.walletBalance || 0;

    if (!profile) {
        // Fallback if somehow they reached dashboard without a profile
        redirect("/onboarding");
    }

    const { firstName, lastName, headline, location, skills, experience, education, bio } = profile as any;

    return (
        <div className="space-y-6">
            {/* Greeting Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-200">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                        Welcome, {firstName}!
                    </h1>
                    <p className="text-zinc-500 mt-1">Here is an overview of your newly created professional profile.</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Profile Complete</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Profile Snapshot */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Basic Info Card */}
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-24 w-24 rounded-full bg-zinc-100 border-4 border-white shadow-md flex items-center justify-center text-zinc-400 mb-4 overflow-hidden">
                                <User className="w-12 h-12" />
                            </div>
                            <h2 className="text-xl font-semibold text-zinc-900">{firstName} {lastName}</h2>
                            <p className="text-zinc-600 text-sm mt-1">{headline}</p>

                            {(location?.city || location?.country) && (
                                <div className="flex items-center justify-center gap-1.5 mt-3 text-zinc-500 text-sm">
                                    <MapPin className="w-4 h-4" />
                                    <span>{[location.city, location.country].filter(Boolean).join(", ")}</span>
                                </div>
                            )}

                            <div className="w-full h-px bg-zinc-100 my-5"></div>

                            <Link href="/dashboard/edit-profile" className="w-full bg-zinc-900 text-white rounded-xl py-2 font-medium hover:bg-zinc-800 transition-colors shadow-sm text-center">
                                Edit Profile
                            </Link>
                            <Link href={`/educator/${profile._id.toString()}`} className="w-full mt-2 bg-white text-zinc-900 border border-zinc-200 rounded-xl py-2 font-medium hover:bg-zinc-50 transition-colors shadow-sm text-center">
                                View Public Profile
                            </Link>
                        </div>
                    </div>

                    {/* Quick Stats or Actions (Placeholder) */}
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-6">
                        <div>
                            <h3 className="text-zinc-900 font-semibold mb-3">Network & Reach</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-600">Profile views</span>
                                    <span className="font-medium text-zinc-900">0</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-600">Connections</span>
                                    <span className="font-medium text-zinc-900">0</span>
                                </div>
                            </div>
                        </div>

                        {isEducator && (
                            <>
                                <div className="w-full h-px bg-zinc-100"></div>
                                <div>
                                    <h3 className="text-zinc-900 font-semibold mb-3 flex items-center justify-between">
                                        Wallet
                                        <span className="text-lg font-black text-emerald-600">${walletBalance}</span>
                                    </h3>
                                    <p className="text-xs text-zinc-500 mb-4 font-medium leading-relaxed">
                                        Available credits. You are charged $5 per unique student lead request.
                                    </p>
                                    <Link
                                        href="/dashboard/plans"
                                        className="flex items-center justify-center gap-2 w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors border border-emerald-200/60 rounded-xl py-2 font-semibold text-sm shadow-sm"
                                    >
                                        <Zap className="w-4 h-4" />
                                        Recharge Wallet
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Column: Detailed Info */}
                <div className="lg:col-span-2 space-y-6">

                    {/* About Section */}
                    {bio && (
                        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8">
                            <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                                About
                            </h3>
                            <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap">
                                {bio}
                            </p>
                        </div>
                    )}

                    {/* Experience Section */}
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8">
                        <h3 className="text-lg font-semibold text-zinc-900 mb-6 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-zinc-400" />
                            Experience
                        </h3>
                        {experience && experience.length > 0 ? (
                            <div className="space-y-6">
                                {experience.map((exp: any, index: number) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                                                <Briefcase className="w-5 h-5 text-zinc-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-zinc-900">{exp.title}</h4>
                                            <p className="text-zinc-600 text-sm">{exp.company}</p>
                                            <p className="text-zinc-500 text-xs mt-1">
                                                {exp.startDate ? new Date(exp.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown'}
                                                {' '}—{' '}
                                                {exp.current ? 'Present' : (exp.endDate ? new Date(exp.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-zinc-500 text-sm">No experience listed.</p>
                        )}
                    </div>

                    {/* Education Section */}
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8">
                        <h3 className="text-lg font-semibold text-zinc-900 mb-6 flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-zinc-400" />
                            Education
                        </h3>
                        {education && education.length > 0 ? (
                            <div className="space-y-6">
                                {education.map((edu: any, index: number) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                                                <GraduationCap className="w-5 h-5 text-zinc-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-zinc-900">{edu.school}</h4>
                                            <p className="text-zinc-600 text-sm">{edu.degree}</p>
                                            <p className="text-zinc-500 text-xs mt-1">
                                                {edu.startDate ? new Date(edu.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown'}
                                                {' '}—{' '}
                                                {edu.endDate ? new Date(edu.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Present'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-zinc-500 text-sm">No education listed.</p>
                        )}
                    </div>

                    {/* Skills Section */}
                    {skills && skills.length > 0 && (
                        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8">
                            <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                                Skills
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill: string, index: number) => (
                                    <span key={index} className="px-3 py-1.5 bg-zinc-100 border border-zinc-200 text-zinc-700 text-sm rounded-lg font-medium">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
