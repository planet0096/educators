import Link from "next/link";
import { GraduationCap, Briefcase, ArrowRight } from "lucide-react";

export default function LoginSelectionPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50 relative overflow-hidden">
            {/* Soft Ambient Background Elements */}
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-100/50 blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-2xl text-center mb-12">
                <div className="inline-flex items-center justify-center h-16 w-16 bg-zinc-900 rounded-2xl shadow-xl mb-8">
                    <span className="text-white font-semibold text-3xl tracking-tighter">E</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 mb-4">
                    Welcome back
                </h1>
                <p className="text-lg text-zinc-500 font-medium">
                    Choose your account type to continue.
                </p>
            </div>

            <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 gap-6">
                {/* Educator Login Card */}
                <Link href="/educator/login" className="group relative bg-white border border-zinc-200/80 rounded-[2rem] p-8 md:p-10 shadow-sm hover:shadow-xl hover:border-emerald-200/60 transition-all duration-300 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Briefcase className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-3 group-hover:text-emerald-600 transition-colors">I am an Educator</h2>
                    <p className="text-zinc-500 font-medium mb-8">
                        Sign in to manage your profile, view student leads, and grow your teaching business.
                    </p>
                    <div className="mt-auto w-full py-3.5 bg-zinc-50 group-hover:bg-emerald-500 group-hover:text-white text-zinc-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                        Log in as Educator <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>

                {/* Student Login Card */}
                <Link href="/student/login" className="group relative bg-white border border-zinc-200/80 rounded-[2rem] p-8 md:p-10 shadow-sm hover:shadow-xl hover:border-indigo-200/60 transition-all duration-300 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <GraduationCap className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-3 group-hover:text-indigo-600 transition-colors">I am a Student</h2>
                    <p className="text-zinc-500 font-medium mb-8">
                        Sign in to connect with top-rated tutors and monitor your learning journey requests.
                    </p>
                    <div className="mt-auto w-full py-3.5 bg-zinc-50 group-hover:bg-indigo-500 group-hover:text-white text-zinc-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                        Log in as Student <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>
            </div>

            <p className="relative z-10 mt-12 text-zinc-500 font-medium">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-zinc-900 font-bold hover:underline decoration-zinc-300 underline-offset-4">
                    Create one now
                </Link>
            </p>
        </div>
    );
}
