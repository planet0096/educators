import { useState, FormEvent, useEffect } from "react";
import { Tag as TagIcon, Plus, Loader2, Trash2 } from "lucide-react";

interface ContactTag {
    _id: string;
    name: string;
    color: string;
    createdAt: string;
}

const PRESET_COLORS = [
    { name: "Gray", value: "#F3F4F6", text: "#374151", border: "#E5E7EB" },
    { name: "Red", value: "#FEF2F2", text: "#991B1B", border: "#FEE2E2" },
    { name: "Orange", value: "#FFF7ED", text: "#9A3412", border: "#FFEDD5" },
    { name: "Amber", value: "#FFFBEB", text: "#92400E", border: "#FEF3C7" },
    { name: "Green", value: "#F0FDF4", text: "#166534", border: "#DCFCE7" },
    { name: "Emerald", value: "#ECFDF5", text: "#065F46", border: "#D1FAE5" },
    { name: "Teal", value: "#F0FDFA", text: "#115E59", border: "#CCFBF1" },
    { name: "Cyan", value: "#ECFEFF", text: "#155E75", border: "#CFFAFE" },
    { name: "Blue", value: "#EFF6FF", text: "#1E40AF", border: "#DBEAFE" },
    { name: "Indigo", value: "#EEF2FF", text: "#3730A3", border: "#E0E7FF" },
    { name: "Purple", value: "#FAF5FF", text: "#6B21A8", border: "#F3E8FF" },
    { name: "Fuchsia", value: "#FDF4FF", text: "#86198F", border: "#FAE8FF" },
    { name: "Pink", value: "#FDF2F8", text: "#9D174D", border: "#FCE7F3" },
    { name: "Rose", value: "#FFF1F2", text: "#9F1239", border: "#FFE4E6" }
];

export default function TagsTab() {
    const [tags, setTags] = useState<ContactTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/whatsapp/tags");
            const data = await res.json();
            if (data.tags) {
                setTags(data.tags);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            const res = await fetch("/api/whatsapp/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, color: JSON.stringify(selectedColor) })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setTags([data.tag, ...tags]);
                setName("");
                setSelectedColor(PRESET_COLORS[0]);
            } else {
                setError(data.error || "Failed to create tag");
            }
        } catch (err) {
            setError("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this tag?")) return;

        try {
            const res = await fetch(`/api/whatsapp/tags?id=${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setTags(tags.filter(tag => tag._id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const parseColor = (colorStr: string) => {
        try {
            return JSON.parse(colorStr);
        } catch {
            return PRESET_COLORS[0];
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 sticky top-6">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-4">Create Tag</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-zinc-900 block mb-1.5">Tag Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. VIP Student"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-zinc-900 block mb-2">Color</label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c.name}
                                        type="button"
                                        onClick={() => setSelectedColor(c)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform ${selectedColor.name === c.name ? "scale-110 border-zinc-900" : "border-transparent hover:scale-110"}`}
                                        style={{ backgroundColor: c.value, borderColor: selectedColor.name === c.name ? c.text : c.border }}
                                        title={c.name}
                                    />
                                ))}
                            </div>

                            <div className="mt-4 p-4 rounded-xl border border-zinc-100 flex items-center justify-center">
                                <span
                                    className="px-3 py-1 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: selectedColor.value,
                                        color: selectedColor.text,
                                        border: `1px solid ${selectedColor.border}`
                                    }}
                                >
                                    {name || "Preview"}
                                </span>
                            </div>
                        </div>

                        {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

                        <button
                            type="submit"
                            disabled={saving || !name}
                            className="w-full bg-emerald-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create Tag
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-200">
                        <h3 className="text-lg font-semibold text-zinc-900">Your Tags</h3>
                    </div>

                    {loading ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                        </div>
                    ) : tags.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <TagIcon className="w-12 h-12 text-zinc-300 mb-4" />
                            <h4 className="text-zinc-900 font-medium mb-1">No tags found</h4>
                            <p className="text-zinc-500 text-sm">Create your first contact tag using the form.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-100">
                            {tags.map(tag => {
                                const c = parseColor(tag.color);
                                return (
                                    <li key={tag._id} className="p-6 hover:bg-zinc-50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-medium"
                                                style={{
                                                    backgroundColor: c.value,
                                                    color: c.text,
                                                    border: `1px solid ${c.border}`
                                                }}
                                            >
                                                {tag.name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(tag._id)}
                                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
