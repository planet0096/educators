import { useState, FormEvent, useEffect } from "react";
import { UserPlus, Loader2, Trash2, Search, Filter, ChevronLeft, ChevronRight, X, Mail, Phone, Hash } from "lucide-react";

interface ContactList {
    _id: string;
    name: string;
}

interface ContactTag {
    _id: string;
    name: string;
    color: string;
}

interface Contact {
    _id: string;
    name: string;
    email?: string;
    phone: string;
    lists: ContactList[];
    tags: ContactTag[];
    createdAt: string;
}

const parseColor = (colorStr: string) => {
    try {
        return JSON.parse(colorStr);
    } catch {
        return { name: "Gray", value: "#F3F4F6", text: "#374151", border: "#E5E7EB" };
    }
};

export default function ContactsTab() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination & Filtering State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [filterList, setFilterList] = useState("");
    const [filterTag, setFilterTag] = useState("");

    // Metadata for dropdowns
    const [availableLists, setAvailableLists] = useState<ContactList[]>([]);
    const [availableTags, setAvailableTags] = useState<ContactTag[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [selectedLists, setSelectedLists] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        // Debounce search slightly
        const timeoutId = setTimeout(() => {
            fetchContacts();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [page, search, filterList, filterTag]);

    const fetchMetadata = async () => {
        try {
            const [listsRes, tagsRes] = await Promise.all([
                fetch("/api/whatsapp/lists"),
                fetch("/api/whatsapp/tags")
            ]);
            const listsData = await listsRes.json();
            const tagsData = await tagsRes.json();

            if (listsData.lists) setAvailableLists(listsData.lists);
            if (tagsData.tags) setAvailableTags(tagsData.tags);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: "10",
                ...(search && { search }),
                ...(filterList && { listId: filterList }),
                ...(filterTag && { tagId: filterTag })
            });

            const res = await fetch(`/api/whatsapp/contacts?${queryParams}`);
            const data = await res.json();

            if (data.contacts) {
                setContacts(data.contacts);
                if (data.pagination) {
                    setTotalPages(data.pagination.pages);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateContact = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            const res = await fetch("/api/whatsapp/contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    email: newEmail,
                    phone: newPhone,
                    lists: selectedLists,
                    tags: selectedTags
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setIsModalOpen(false);
                setNewName("");
                setNewEmail("");
                setNewPhone("");
                setSelectedLists([]);
                setSelectedTags([]);
                // Reload first page to show new contact
                setPage(1);
                fetchContacts();
            } else {
                setError(data.error || "Failed to create contact");
            }
        } catch (err) {
            setError("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this contact?")) return;

        try {
            const res = await fetch(`/api/whatsapp/contacts/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                fetchContacts();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleListSelection = (id: string) => {
        setSelectedLists(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
    };

    const toggleTagSelection = (id: string) => {
        setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-6">

            {/* Top Toolbar */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-zinc-200">
                <div className="flex flex-col md:flex-row w-full lg:w-auto gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={filterList}
                            onChange={(e) => { setFilterList(e.target.value); setPage(1); }}
                            className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                        >
                            <option value="">All Lists</option>
                            {availableLists.map(list => (
                                <option key={list._id} value={list._id}>{list.name}</option>
                            ))}
                        </select>

                        <select
                            value={filterTag}
                            onChange={(e) => { setFilterTag(e.target.value); setPage(1); }}
                            className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                        >
                            <option value="">All Tags</option>
                            {availableTags.map(tag => (
                                <option key={tag._id} value={tag._id}>{tag.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="w-full lg:w-auto flex justify-end">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-emerald-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2 w-full lg:w-auto"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Contact
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                {loading && contacts.length === 0 ? (
                    <div className="flex justify-center items-center h-[400px]">
                        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-zinc-500">
                        <UserPlus className="w-12 h-12 text-zinc-300 mb-4" />
                        <p className="font-medium text-zinc-900">No contacts found</p>
                        <p className="text-sm">Try adjusting your search or add a new contact.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/50 border-b border-zinc-200 text-left">
                                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Lists</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tags</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {contacts.map((contact) => (
                                    <tr key={contact._id} className="hover:bg-zinc-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {contact.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-zinc-900">{contact.name}</div>
                                                    <div className="text-zinc-500 text-xs flex gap-3 mt-1">
                                                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.phone}</span>
                                                        {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 flex-wrap max-w-xs">
                                                {contact.lists.length === 0 ? <span className="text-zinc-400 text-xs italic">No lists</span> :
                                                    contact.lists.map(l => (
                                                        <span key={l._id} className="bg-zinc-100 text-zinc-700 px-2 py-1 rounded border border-zinc-200 text-[10px] uppercase font-bold tracking-wider">
                                                            {l.name}
                                                        </span>
                                                    ))
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 flex-wrap max-w-xs">
                                                {contact.tags.length === 0 ? <span className="text-zinc-400 text-xs italic">No tags</span> :
                                                    contact.tags.map(t => {
                                                        const c = parseColor(t.color);
                                                        return (
                                                            <span key={t._id} className="px-2 py-1 rounded text-[10px] font-bold" style={{ backgroundColor: c.value, color: c.text, border: `1px solid ${c.border}` }}>
                                                                {t.name}
                                                            </span>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(contact._id)}
                                                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-zinc-200 flex items-center justify-between bg-zinc-50">
                        <span className="text-sm text-zinc-500 font-medium">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-zinc-200 text-zinc-600 rounded-lg bg-white disabled:opacity-50 hover:bg-zinc-100 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-zinc-200 text-zinc-600 rounded-lg bg-white disabled:opacity-50 hover:bg-zinc-100 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Contact Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm shadow-2xl">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-emerald-600" />
                                Add New Contact
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 p-2 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto w-full">
                            <form id="contact-form" onSubmit={handleCreateContact} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-zinc-900 block mb-1.5">Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-zinc-900 block mb-1.5">Phone Number *</label>
                                            <input
                                                type="text"
                                                required
                                                value={newPhone}
                                                onChange={e => setNewPhone(e.target.value)}
                                                placeholder="With country code e.g. 919876543210"
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-zinc-900 block mb-1.5">Email Address</label>
                                            <input
                                                type="email"
                                                value={newEmail}
                                                onChange={e => setNewEmail(e.target.value)}
                                                placeholder="john@example.com"
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-zinc-100 pt-6 space-y-6">
                                    <div>
                                        <label className="text-sm font-bold text-zinc-900 block mb-3">Assign to Lists</label>
                                        <div className="flex flex-wrap gap-2">
                                            {availableLists.length === 0 ? <p className="text-sm text-zinc-500 italic">No lists created yet.</p> :
                                                availableLists.map(list => (
                                                    <button
                                                        type="button"
                                                        key={list._id}
                                                        onClick={() => toggleListSelection(list._id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide border transition-all ${selectedLists.includes(list._id)
                                                                ? "bg-zinc-900 text-white border-zinc-900 scale-105 shadow-md"
                                                                : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                                                            }`}
                                                    >
                                                        {list.name}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-zinc-900 block mb-3">Assign Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {availableTags.length === 0 ? <p className="text-sm text-zinc-500 italic">No tags created yet.</p> :
                                                availableTags.map(tag => {
                                                    const c = parseColor(tag.color);
                                                    const isSelected = selectedTags.includes(tag._id);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={tag._id}
                                                            onClick={() => toggleTagSelection(tag._id)}
                                                            className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${isSelected ? "scale-105 shadow-md opacity-100" : "opacity-60 hover:opacity-100"}`}
                                                            style={{
                                                                backgroundColor: c.value,
                                                                color: c.text,
                                                                borderColor: isSelected ? c.text : c.border,
                                                                borderWidth: isSelected ? '2px' : '1px'
                                                            }}
                                                        >
                                                            {tag.name}
                                                        </button>
                                                    );
                                                })
                                            }
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3 shrink-0">
                            {error && <span className="text-red-500 text-sm font-medium self-center mr-auto">{error}</span>}
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-200/50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="contact-form"
                                disabled={saving || !newName || !newPhone}
                                className="bg-emerald-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Contact"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
