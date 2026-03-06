import Link from "next/link";
import { GraduationCap, Briefcase, ArrowRight } from "lucide-react";

export default function RegisterSelectionPage() {
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
                    Join the network
                </h1>
                <p className="text-lg text-zinc-500 font-medium">
                    What brings you here today?
                </p>
            </div>

            <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 gap-6">
                {/* Educator Register Card */}
                <Link href="/educator/register" className="group relative bg-white border border-zinc-200/80 rounded-[2rem] p-8 md:p-10 shadow-sm hover:shadow-xl hover:border-emerald-200/60 transition-all duration-300 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Briefcase className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-3 group-hover:text-emerald-600 transition-colors">I am an Educator</h2>
                    <p className="text-zinc-500 font-medium mb-8">
                        Join to set up your professional profile, accept student call requests, and monetize your expertise.
                    </p>
                    <div className="mt-auto w-full py-3.5 bg-zinc-50 group-hover:bg-emerald-500 group-hover:text-white text-zinc-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                        Get Started as Educator <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>

                {/* Student Register Card */}
                <Link href="/student/register" className="group relative bg-white border border-zinc-200/80 rounded-[2rem] p-8 md:p-10 shadow-sm hover:shadow-xl hover:border-indigo-200/60 transition-all duration-300 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <GraduationCap className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-3 group-hover:text-indigo-600 transition-colors">I am a Student</h2>
                    <p className="text-zinc-500 font-medium mb-8">
                        Join to browse the global network of top verified tutors and schedule learning sessions.
                    </p>
                    <div className="mt-auto w-full py-3.5 bg-zinc-50 group-hover:bg-indigo-500 group-hover:text-white text-zinc-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                        Get Started as Student <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>
            </div>

            <p className="relative z-10 mt-12 text-zinc-500 font-medium">
                Already have an account?{" "}
                <Link href="/login" className="text-zinc-900 font-bold hover:underline decoration-zinc-300 underline-offset-4">
                    Sign in here
                </Link>
            </p>
        </div>
    );
}
