"use client";

import { useState } from "react";
import { Users, List, Tags, Settings2 } from "lucide-react";
import ContactsTab from "../components/ContactsTab";
import ListsTab from "../components/ListsTab";
import TagsTab from "../components/TagsTab";
import CustomFieldsTab from "../components/CustomFieldsTab";

type Tab = "contacts" | "lists" | "tags" | "customfields";

interface TabDef {
    key: Tab;
    label: string;
    icon: React.ElementType;
}

const TABS: TabDef[] = [
    { key: "contacts", label: "Contacts", icon: Users },
    { key: "lists", label: "Lists", icon: List },
    { key: "tags", label: "Tags", icon: Tags },
    { key: "customfields", label: "Custom Fields", icon: Settings2 },
];

export default function ContactsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("contacts");

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2.5">
                    <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4" />
                    </span>
                    Contacts
                </h1>
                <p className="text-zinc-500 text-sm mt-1">
                    Manage your WhatsApp contacts, lists, tags and custom fields.
                </p>
            </div>

            {/* Tab Bar */}
            <div className="flex items-center gap-1 border-b border-zinc-200 bg-white px-1 rounded-t-2xl overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-3.5 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.key
                                ? "border-emerald-600 text-emerald-700"
                                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-2">
                {activeTab === "contacts" && <ContactsTab />}
                {activeTab === "lists" && <ListsTab />}
                {activeTab === "tags" && <TagsTab />}
                {activeTab === "customfields" && <CustomFieldsTab />}
            </div>
        </div>
    );
}
