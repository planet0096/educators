"use client";
import { useState, useEffect } from "react";
import {
    Settings2, Plus, Trash2, Loader2, ChevronUp, ChevronDown,
    Type, Hash, Mail, Phone, Calendar, List, CheckSquare, Link, AlignLeft, X, GripVertical
} from "lucide-react";

type CustomFieldType = "text" | "number" | "email" | "phone" | "date" | "dropdown" | "checkbox" | "textarea" | "url";

interface CustomField {
    _id: string;
    key: string;
    label: string;
    type: CustomFieldType;
    options: string[];
    isRequired: boolean;
    order: number;
}

const FIELD_TYPES: { value: CustomFieldType; label: string; icon: React.ComponentType<any>; desc: string }[] = [
    { value: "text", label: "Text", icon: Type, desc: "Short text input" },
    { value: "number", label: "Number", icon: Hash, desc: "Numeric value" },
    { value: "email", label: "Email", icon: Mail, desc: "Email address" },
    { value: "phone", label: "Phone", icon: Phone, desc: "Phone number" },
    { value: "date", label: "Date", icon: Calendar, desc: "Date picker" },
    { value: "dropdown", label: "Dropdown", icon: List, desc: "Select from options" },
    { value: "checkbox", label: "Checkbox", icon: CheckSquare, desc: "Yes / No" },
    { value: "textarea", label: "Textarea", icon: AlignLeft, desc: "Long text / notes" },
    { value: "url", label: "URL", icon: Link, desc: "Website link" },
];

const getTypeIcon = (type: CustomFieldType) => {
    const t = FIELD_TYPES.find(f => f.value === type);
    const Icon = t?.icon || Type;
    return <Icon className="w-3.5 h-3.5" />;
};

const TYPE_COLORS: Record<CustomFieldType, string> = {
    text: "bg-blue-50 text-blue-700 border-blue-200",
    number: "bg-violet-50 text-violet-700 border-violet-200",
    email: "bg-sky-50 text-sky-700 border-sky-200",
    phone: "bg-green-50 text-green-700 border-green-200",
    date: "bg-orange-50 text-orange-700 border-orange-200",
    dropdown: "bg-pink-50 text-pink-700 border-pink-200",
    checkbox: "bg-teal-50 text-teal-700 border-teal-200",
    textarea: "bg-zinc-100 text-zinc-700 border-zinc-200",
    url: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function CustomFieldsTab() {
    const [fields, setFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // New field form state
    const [newLabel, setNewLabel] = useState("");
    const [newType, setNewType] = useState<CustomFieldType>("text");
    const [newOptions, setNewOptions] = useState("");
    const [newRequired, setNewRequired] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        fetchFields();
    }, []);

    const fetchFields = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/whatsapp/custom-fields");
            const data = await res.json();
            if (data.fields) setFields(data.fields);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!newLabel.trim()) { setFormError("Label is required"); return; }
        setSaving(true);
        try {
            const options = newType === "dropdown"
                ? newOptions.split(",").map(o => o.trim()).filter(Boolean)
                : [];
            const res = await fetch("/api/whatsapp/custom-fields", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label: newLabel.trim(), type: newType, options, isRequired: newRequired }),
            });
            const data = await res.json();
            if (!res.ok) { setFormError(data.error || "Failed to create field"); return; }
            setFields(prev => [...prev, data.field]);
            setNewLabel(""); setNewType("text"); setNewOptions(""); setNewRequired(false);
            setShowForm(false);
        } catch {
            setFormError("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this custom field? All stored values will be lost.")) return;
        setDeletingId(id);
        try {
            await fetch(`/api/whatsapp/custom-fields/${id}`, { method: "DELETE" });
            setFields(prev => prev.filter(f => f._id !== id));
        } catch {
            console.error("Delete failed");
        } finally {
            setDeletingId(null);
        }
    };

    const handleReorder = async (id: string, direction: "up" | "down") => {
        const idx = fields.findIndex(f => f._id === id);
        if (direction === "up" && idx === 0) return;
        if (direction === "down" && idx === fields.length - 1) return;

        const newFields = [...fields];
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        [newFields[idx], newFields[swapIdx]] = [newFields[swapIdx], newFields[idx]];
        setFields(newFields);

        // Persist order for both swapped fields
        await Promise.all([
            fetch(`/api/whatsapp/custom-fields/${newFields[idx]._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order: idx }),
            }),
            fetch(`/api/whatsapp/custom-fields/${newFields[swapIdx]._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order: swapIdx }),
            }),
        ]);
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-emerald-600" />
                        Custom Fields
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">
                        Define extra fields to capture on your contacts. These will appear in the Add/Edit Contact form.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setFormError(null); }}
                    className="bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2 shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Add Field
                </button>
            </div>

            {/* Suggested field types info */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {FIELD_TYPES.map(ft => {
                    const Icon = ft.icon;
                    return (
                        <div key={ft.value} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium ${TYPE_COLORS[ft.value]}`}>
                            <Icon className="w-4 h-4" />
                            <span>{ft.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Add Field Form */}
            {showForm && (
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900 text-sm">New Custom Field</h3>
                        <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-full hover:bg-zinc-100">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <form onSubmit={handleCreate} className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">Field Label *</label>
                                <input
                                    type="text"
                                    value={newLabel}
                                    onChange={e => setNewLabel(e.target.value)}
                                    placeholder="e.g. Lead Stage, City, Score"
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">Field Type *</label>
                                <select
                                    value={newType}
                                    onChange={e => setNewType(e.target.value as CustomFieldType)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                >
                                    {FIELD_TYPES.map(ft => (
                                        <option key={ft.value} value={ft.value}>{ft.label} — {ft.desc}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {newType === "dropdown" && (
                            <div>
                                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">Options (comma-separated)</label>
                                <input
                                    type="text"
                                    value={newOptions}
                                    onChange={e => setNewOptions(e.target.value)}
                                    placeholder="e.g. Hot, Warm, Cold"
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        )}

                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <div
                                onClick={() => setNewRequired(r => !r)}
                                className={`w-9 h-5 rounded-full transition-colors flex items-center ${newRequired ? "bg-emerald-500" : "bg-zinc-200"}`}
                            >
                                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${newRequired ? "translate-x-4" : "translate-x-0"}`} />
                            </div>
                            <span className="text-sm text-zinc-700 font-medium">Required field</span>
                        </label>

                        {formError && <p className="text-red-500 text-sm font-medium">{formError}</p>}

                        <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Create Field
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Fields List */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                ) : fields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                        <Settings2 className="w-10 h-10 mb-3 text-zinc-200" />
                        <p className="font-medium text-zinc-500">No custom fields yet</p>
                        <p className="text-sm mt-1">Click "Add Field" to create your first one.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-zinc-100">
                        {fields.map((field, idx) => (
                            <li key={field._id} className="flex items-center gap-3 px-5 py-4 group hover:bg-zinc-50/80 transition-colors">
                                <GripVertical className="w-4 h-4 text-zinc-300 shrink-0" />
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold ${TYPE_COLORS[field.type]} shrink-0`}>
                                    {getTypeIcon(field.type)}
                                    <span className="capitalize">{field.type}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-zinc-900 text-sm">{field.label}</span>
                                        {field.isRequired && (
                                            <span className="text-[10px] font-bold bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded">Required</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-zinc-400 font-mono">key: {field.key}</span>
                                    {field.type === "dropdown" && field.options.length > 0 && (
                                        <div className="flex gap-1 flex-wrap mt-1">
                                            {field.options.map(opt => (
                                                <span key={opt} className="text-[10px] bg-pink-50 text-pink-700 border border-pink-200 px-1.5 py-0.5 rounded font-medium">{opt}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleReorder(field._id, "up")}
                                        disabled={idx === 0}
                                        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleReorder(field._id, "down")}
                                        disabled={idx === fields.length - 1}
                                        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(field._id)}
                                        disabled={deletingId === field._id}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                                    >
                                        {deletingId === field._id
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <Trash2 className="w-3.5 h-3.5" />
                                        }
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <p className="text-xs text-zinc-400 text-center">
                {fields.length} custom field{fields.length !== 1 ? "s" : ""} defined
            </p>
        </div>
    );
}
