'use client';

import {
    MapPin,
    Filter,
    Globe,
    Zap
} from "lucide-react";

interface FilterSidebarProps {
    filters: {
        country: string;
        city: string;
        skill: string;
    };
    onFilterChange: (key: string, value: string) => void;
    onClear: () => void;
}

export default function FilterSidebar({ filters, onFilterChange, onClear }: FilterSidebarProps) {

    return (
        <div className="bg-white border border-zinc-200/80 rounded-[2rem] shadow-sm p-6 sticky top-24">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <Filter className="w-5 h-5" /> Filters
                </h2>
                <button
                    onClick={onClear}
                    className="text-sm font-medium text-zinc-500 hover:text-red-500 transition-colors"
                >
                    Clear All
                </button>
            </div>

            <div className="space-y-6">
                {/* Country Filter */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5"><Globe className="w-4 h-4 text-zinc-400" /> Country</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={filters.country}
                            onChange={(e) => onFilterChange("country", e.target.value)}
                            placeholder="e.g. United Kingdom"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                        />
                    </div>
                </div>

                {/* City Filter */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-zinc-400" /> City</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={filters.city}
                            onChange={(e) => onFilterChange("city", e.target.value)}
                            placeholder="e.g. London"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                        />
                    </div>
                </div>

                {/* Skill Filter */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5"><Zap className="w-4 h-4 text-zinc-400" /> Skill</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={filters.skill}
                            onChange={(e) => onFilterChange("skill", e.target.value)}
                            placeholder="e.g. Python, IELTS"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-[3px] focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
