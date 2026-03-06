import { useState, FormEvent, useEffect } from "react";
import { ListX, Plus, Loader2, Trash2 } from "lucide-react";

interface ContactList {
    _id: string;
    name: string;
    description: string;
    createdAt: string;
}

export default function ListsTab() {
    const [lists, setLists] = useState<ContactList[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLists();
    }, []);

    const fetchLists = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/whatsapp/lists");
            const data = await res.json();
            if (data.lists) {
                setLists(data.lists);
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
            const res = await fetch("/api/whatsapp/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setLists([data.list, ...lists]);
                setName("");
                setDescription("");
            } else {
                setError(data.error || "Failed to create list");
            }
        } catch (err) {
            setError("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this list?")) return;

        try {
            const res = await fetch(`/api/whatsapp/lists?id=${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setLists(lists.filter(list => list._id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 sticky top-6">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-4">Create List</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-zinc-900 block mb-1.5">Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Summer 2026 Cohort"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-zinc-900 block mb-1.5">Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief details about this list"
                                rows={3}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm resize-none"
                            />
                        </div>

                        {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

                        <button
                            type="submit"
                            disabled={saving || !name}
                            className="w-full bg-emerald-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create List
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-200">
                        <h3 className="text-lg font-semibold text-zinc-900">Your Lists</h3>
                    </div>

                    {loading ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                        </div>
                    ) : lists.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <ListX className="w-12 h-12 text-zinc-300 mb-4" />
                            <h4 className="text-zinc-900 font-medium mb-1">No lists found</h4>
                            <p className="text-zinc-500 text-sm">Create your first contact list using the form.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-100">
                            {lists.map(list => (
                                <li key={list._id} className="p-6 hover:bg-zinc-50 transition-colors flex items-center justify-between group">
                                    <div>
                                        <h4 className="font-semibold text-zinc-900">{list.name}</h4>
                                        {list.description && <p className="text-zinc-500 text-sm mt-1">{list.description}</p>}
                                        <p className="text-zinc-400 text-xs mt-2">
                                            Created {new Date(list.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(list._id)}
                                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
