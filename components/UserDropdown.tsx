"use client";

import { useState, useRef, useEffect } from "react";
import { UserCircle, Settings, LogOut, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function UserDropdown({ userEmail }: { userEmail: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        setIsLoggingOut(true);
        await signOut({ callbackUrl: "/login" });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-9 w-9 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-600 overflow-hidden hover:ring-2 hover:ring-zinc-900/20 transition-all focus:outline-none"
            >
                <UserCircle className="h-full w-full opacity-80" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-zinc-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-zinc-100">
                        <p className="text-sm font-medium text-zinc-900 truncate">Account</p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{userEmail}</p>
                    </div>

                    <div className="p-1.5">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-2.5 py-2 text-sm text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <UserCircle className="w-4 h-4" />
                            Profile
                        </Link>
                        <Link
                            href="#"
                            className="flex items-center gap-2 px-2.5 py-2 text-sm text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </Link>
                    </div>

                    <div className="px-1.5 py-1.5 border-t border-zinc-100">
                        <button
                            onClick={handleSignOut}
                            disabled={isLoggingOut}
                            className="flex items-center gap-2 w-full px-2.5 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isLoggingOut ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <LogOut className="w-4 h-4" />
                            )}
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
