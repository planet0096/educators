import Link from "next/link";
import { MapPin, BookOpen, Star, User } from "lucide-react";

interface EducatorCardProps {
    profile: any;
}

export default function EducatorCard({ profile }: EducatorCardProps) {
    const { _id, firstName, lastName, headline, location, skills, targetExam, user } = profile;

    // Default to the user avatar if profile hasn't explicitly set one, or a placeholder
    const avatarUrl = profile.avatarUrl || user?.avatar || null;

    return (
        <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group flex flex-col h-full">
            <div className="flex items-start gap-4 mb-5">
                <div className="relative">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={`${firstName} ${lastName}`}
                            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-zinc-100 group-hover:ring-blue-100 transition-colors"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center ring-2 ring-zinc-50 group-hover:ring-blue-50 transition-colors">
                            <span className="text-xl font-bold text-zinc-500">{firstName.charAt(0)}{lastName.charAt(0)}</span>
                        </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>

                <div className="flex-1">
                    <h3 className="text-lg font-bold text-zinc-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {firstName} {lastName}
                    </h3>
                    <p className="text-sm font-medium text-zinc-600 line-clamp-1 mb-1.5">{headline}</p>
                    {location && (location.city || location.country) && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{[location.city, location.country].filter(Boolean).join(", ")}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {targetExam && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-lg text-[13px] font-semibold">
                        <BookOpen className="w-3.5 h-3.5" />
                        {targetExam}
                    </span>
                )}

                {skills && skills.slice(0, 3).map((skill: string, idx: number) => (
                    <span key={idx} className="inline-flex items-center px-2.5 py-1 bg-zinc-50 text-zinc-600 border border-zinc-200/60 rounded-lg text-[13px] font-medium">
                        {skill}
                    </span>
                ))}

                {skills && skills.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 bg-zinc-50 text-zinc-500 border border-zinc-200/60 rounded-lg text-[13px] font-medium">
                        +{skills.length - 3}
                    </span>
                )}
            </div>

            <div className="mt-auto pt-5 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-zinc-900">4.9 {Math.floor(Math.random() * 5)}</span>
                    <span className="text-xs text-zinc-500 font-medium">(12+ reviews)</span>
                </div>

                <Link
                    href={`/educator/${_id}`}
                    className="inline-flex items-center justify-center px-4 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
                >
                    View Profile
                </Link>
            </div>
        </div>
    );
}
