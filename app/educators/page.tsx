'use client';

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Users, Search } from "lucide-react";
import EducatorCard from "./EducatorCard";
import FilterSidebar from "./FilterSidebar";

function EducatorsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Default filters
    const [filters, setFilters] = useState({
        country: searchParams.get("country") || "",
        city: searchParams.get("city") || "",
        skill: searchParams.get("skill") || ""
    });

    const [educators, setEducators] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchEducators = useCallback(async (currentFilters: typeof filters) => {
        setIsLoading(true);
        setError("");

        try {
            // Build query string
            const params = new URLSearchParams();
            if (currentFilters.country) params.append("country", currentFilters.country);
            if (currentFilters.city) params.append("city", currentFilters.city);
            if (currentFilters.skill) params.append("skill", currentFilters.skill);

            const queryString = params.toString();
            const res = await fetch(`/api/educators${queryString ? `?${queryString}` : ""}`);

            if (!res.ok) throw new Error("Failed to load educators");

            const data = await res.json();
            setEducators(data.educators || []);
        } catch (err: any) {
            setError("Could not load educators at this time. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load and URL param sync
    useEffect(() => {
        fetchEducators(filters);
    }, [filters, fetchEducators]);

    // Update URL when filters change incrementally
    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);

        // Update URL strictly for shareability (shallow)
        const params = new URLSearchParams();
        if (newFilters.country) params.append("country", newFilters.country);
        if (newFilters.city) params.append("city", newFilters.city);
        if (newFilters.skill) params.append("skill", newFilters.skill);

        router.replace(`/educators?${params.toString()}`, { scroll: false });
    };

    const handleClearFilters = () => {
        const resetFilters = { country: "", city: "", skill: "" };
        setFilters(resetFilters);
        router.replace("/educators", { scroll: false });
    };

    return (
        <div className="min-h-screen bg-zinc-50/50 pb-20">
            {/* Minimalist Header Area */}
            <div className="bg-white border-b border-zinc-200/80 pt-16 pb-12 px-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="max-w-7xl mx-auto text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 mb-2">
                            Find Your Expert Educator
                        </h1>
                        <p className="text-zinc-500 font-medium max-w-2xl text-lg">
                            Connect with top-rated professionals verified to help you succeed in your curriculum.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="max-w-7xl mx-auto px-4 pt-10 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

                {/* Left Sidebar (Filters) */}
                <div className="lg:col-span-1 hidden md:block">
                    <FilterSidebar
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClear={handleClearFilters}
                    />
                </div>

                {/* Right Column (Results) */}
                <div className="lg:col-span-3 space-y-6">

                    {/* Mobile Filters Toggle Area - Visible only on small screens */}
                    <div className="md:hidden">
                        <FilterSidebar
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onClear={handleClearFilters}
                        />
                    </div>

                    {/* Results Status Header */}
                    <div className="flex items-center justify-between bg-white border border-zinc-200/80 rounded-2xl px-5 py-3.5 shadow-sm">
                        <div className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            {isLoading ? "Searching..." : `${educators.length} Educator${educators.length !== 1 ? 's' : ''} Found`}
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-4 bg-white/50 border border-zinc-200/50 rounded-3xl">
                            <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                            <p className="font-medium text-sm">Searching for the best matches...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {!isLoading && error && (
                        <div className="bg-red-50 text-red-600 border border-red-100 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
                            <h3 className="font-bold text-lg mb-2">Oops! Something went wrong</h3>
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !error && educators.length === 0 && (
                        <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-16 text-center shadow-sm flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                                <Search className="w-8 h-8 text-zinc-300" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 mb-2">No educators found</h3>
                            <p className="text-zinc-500 font-medium max-w-sm mb-8">Try adjusting your filters, location, or search keywords to find more available trainers.</p>
                            <button
                                onClick={handleClearFilters}
                                className="px-6 py-2.5 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors shadow-sm focus:outline-none focus:ring-[3px] focus:ring-zinc-900/20"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}

                    {/* Results Grid */}
                    {!isLoading && educators.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {educators.map((profile: any) => (
                                <EducatorCard key={profile._id} profile={profile} />
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

// Wrap in Suspense boundary as required by Next.js for components using useSearchParams
export default function EducatorsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-300" /></div>}>
            <EducatorsPageContent />
        </Suspense>
    );
}
