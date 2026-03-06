"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Target, Calendar, Lock, Unlock, Loader2, Mail, Phone, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

export default function FindStudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [examFilter, setExamFilter] = useState("All");
    const [locationFilter, setLocationFilter] = useState("All");

    // Unlocking State
    const [unlockingId, setUnlockingId] = useState<string | null>(null);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/students?page=${page}&limit=20&exam=${examFilter}&location=${locationFilter}`);
            if (!res.ok) throw new Error("Failed to fetch students");
            const data = await res.json();
            setStudents(data.students || []);
            setTotalPages(data.pagination?.pages || 1);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, examFilter, locationFilter]);

    const handleUnlock = async (studentId: string) => {
        const confirmUnlock = window.confirm("This will deduct $5 from your wallet to reveal the student's contact details permanently. Proceed?");
        if (!confirmUnlock) return;

        setUnlockingId(studentId);
        try {
            const res = await fetch("/api/students/unlock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to unlock");

            toast.success("Contact details revealed! Wallet deducted by $5.");

            // Re-fetch to get unblurred data
            fetchStudents();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setUnlockingId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Find Students</h1>
                    <p className="text-zinc-500 mt-1">Discover motivated students globally. Unlock direct contact for $5 per lead.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full sm:w-auto">
                        <label className="text-xs font-medium text-zinc-500 mb-1 block">Target Exam</label>
                        <select
                            value={examFilter}
                            onChange={(e) => { setExamFilter(e.target.value); setPage(1); }}
                            className="w-full sm:w-40 border border-zinc-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 bg-white"
                        >
                            <option value="All">All Exams</option>
                            <option value="IELTS">IELTS</option>
                            <option value="TOEFL">TOEFL</option>
                            <option value="GRE">GRE</option>
                            <option value="GMAT">GMAT</option>
                            <option value="SAT">SAT</option>
                        </select>
                    </div>
                    <div className="w-full sm:w-auto">
                        <label className="text-xs font-medium text-zinc-500 mb-1 block">Location</label>
                        <select
                            value={locationFilter}
                            onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
                            className="w-full sm:w-40 border border-zinc-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 bg-white"
                        >
                            <option value="All">Global</option>
                            <option value="India">India</option>
                            <option value="USA">USA</option>
                            <option value="UK">UK</option>
                            <option value="Canada">Canada</option>
                            <option value="Australia">Australia</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Student</th>
                                <th className="px-6 py-4 font-medium">Target Exam</th>
                                <th className="px-6 py-4 font-medium">Location</th>
                                <th className="px-6 py-4 font-medium text-right">Contact Info</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {loading && students.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading directory...
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                        No students found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => (
                                    <tr key={student._id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold font-serif shrink-0 border border-indigo-100">
                                                    {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-zinc-900 flex items-center gap-2">
                                                        {student.firstName} {student.lastName}
                                                        {!student.isUnlocked && <Lock className="w-3 h-3 text-zinc-400" />}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        Joined {new Date(student.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.targetExam ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/50">
                                                    <Target className="w-3.5 h-3.5" />
                                                    {student.targetExam}
                                                </span>
                                            ) : (
                                                <span className="text-zinc-400 italic">Not specified</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-zinc-600">
                                                <MapPin className="w-4 h-4 text-zinc-400" />
                                                {student.location?.city || student.location?.country ?
                                                    `${student.location.city || ''}${student.location.city && student.location.country ? ', ' : ''}${student.location.country || ''}`
                                                    : <span className="text-zinc-400 italic">Not specified</span>
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {student.isUnlocked ? (
                                                <div className="flex flex-col items-end gap-1.5 text-xs">
                                                    {student.user?.email && (
                                                        <a href={`mailto:${student.user.email}`} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium">
                                                            {student.user.email} <Mail className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                    {student.phoneNumber ? (
                                                        <a href={`tel:${student.phoneNumber}`} className="flex items-center gap-1.5 text-zinc-700 hover:text-zinc-900 font-medium">
                                                            {student.phoneNumber} <Phone className="w-3.5 h-3.5" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-zinc-400 italic">No phone provided</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleUnlock(student.user._id)}
                                                    disabled={unlockingId === student.user._id}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                                >
                                                    {unlockingId === student.user._id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Unlock className="w-3.5 h-3.5" />
                                                    )}
                                                    Reveal Contact ($5)
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
