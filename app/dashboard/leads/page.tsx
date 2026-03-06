"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Users,
    Search,
    Filter,
    MoreHorizontal,
    Mail,
    Phone,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2
} from "lucide-react";

type Lead = {
    _id: string;
    studentId: string;
    status: "pending" | "accepted" | "declined";
    createdAt: string;
    student: {
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber?: string;
        targetExam?: string;
        examDate?: string;
        location?: {
            city?: string;
            country?: string;
        };
    };
};

export default function LeadsCrmPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                const res = await fetch("/api/leads");
                const data = await res.json();
                if (data.success) {
                    setLeads(data.leads);
                }
            } catch (error) {
                console.error("Failed to fetch leads:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeads();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "accepted":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accepted
                    </span>
                );
            case "declined":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" />
                        Declined
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        Pending
                    </span>
                );
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Leads CRM</h1>
                    <p className="text-zinc-500 mt-1">Manage prospective students and incoming requests.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            className="w-full sm:w-64 bg-white border border-zinc-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm">
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Filter</span>
                    </button>
                </div>
            </div>

            {/* Table/List View */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50/50">
                                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Student Profile</th>
                                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact Info</th>
                                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Target Goal</th>
                                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {leads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
                                                <Users className="w-6 h-6 text-zinc-400" />
                                            </div>
                                            <p className="font-medium text-zinc-900">No leads yet</p>
                                            <p className="text-sm mt-1">When students request a call, they will appear here.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead._id} className="hover:bg-zinc-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0">
                                                    {lead.student.firstName.charAt(0)}{lead.student.lastName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-zinc-900">{lead.student.firstName} {lead.student.lastName}</p>
                                                    <p className="text-xs text-zinc-500">Requested {new Date(lead.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                                                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                                    {lead.student.email}
                                                </div>
                                                {lead.student.phoneNumber && (
                                                    <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                                                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                                        {lead.student.phoneNumber}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-1">
                                                {lead.student.targetExam ? (
                                                    <p className="text-sm font-medium text-zinc-900">{lead.student.targetExam}</p>
                                                ) : (
                                                    <p className="text-sm text-zinc-400 italic">Not specified</p>
                                                )}
                                                {lead.student.examDate && (
                                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(lead.student.examDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(lead.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}
