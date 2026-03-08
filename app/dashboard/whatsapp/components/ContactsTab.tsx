"use client";
import { useState, useCallback, useEffect, useRef, FormEvent } from "react";
import {
    UserPlus, Loader2, Trash2, Search, ChevronLeft, ChevronRight, X, Mail,
    Phone, ChevronUp, ChevronDown, ChevronsUpDown, Pencil, CheckSquare,
    Square, Tags, List, Settings2, AlertCircle, Building2, MapPin, Globe,
    FileText, Calendar, Zap, Hash, SlidersHorizontal, Eye, EyeOff
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface ContactList { _id: string; name: string; }
interface ContactTag { _id: string; name: string; color: string; }

interface Contact {
    _id: string;
    name: string;
    email?: string;
    phone: string;
    city?: string;
    company?: string;
    website?: string;
    notes?: string;
    source?: string;
    dateOfBirth?: string;
    customFieldValues?: Record<string, any>;
    lists: ContactList[];
    tags: ContactTag[];
    createdAt: string;
}

type SortField = "name" | "phone" | "city" | "company" | "createdAt";
type BulkAction = "delete" | "assignLists" | "removeLists" | "assignTags" | "removeTags";

// ─── Column Config ────────────────────────────────────────────────────────────

type ColumnKey = "contact" | "city" | "company" | "listsAndTags" | "source" | "createdAt";

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
}

const STATIC_COLUMNS: ColumnDef[] = [
    { key: "contact", label: "Phone / Email", defaultVisible: true },
    { key: "city", label: "City", defaultVisible: true },
    { key: "company", label: "Company", defaultVisible: true },
    { key: "source", label: "Source", defaultVisible: false },
    { key: "listsAndTags", label: "Lists & Tags", defaultVisible: true },
    { key: "createdAt", label: "Date Added", defaultVisible: true },
];

const LS_KEY = "contacts_visible_cols";

function loadVisibleCols(customFields: { key: string }[]): Record<string, boolean> {
    try {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) return JSON.parse(stored);
    } catch { }
    const defaults: Record<string, boolean> = {};
    STATIC_COLUMNS.forEach(c => { defaults[c.key] = c.defaultVisible; });
    customFields.forEach(cf => { defaults[`cf_${cf.key}`] = true; });
    return defaults;
}

function saveVisibleCols(cols: Record<string, boolean>) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cols)); } catch { }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseColor = (colorStr: string) => {
    try { return JSON.parse(colorStr); }
    catch { return { name: "Gray", value: "#F3F4F6", text: "#374151", border: "#E5E7EB" }; }
};

const formatDate = (iso?: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Custom Field Renderer ─────────────────────────────────────────────────────

function CustomFieldInput({
    field,
    value,
    onChange,
}: {
    field: CustomField;
    value: any;
    onChange: (key: string, val: any) => void;
}) {
    const base = "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500";

    if (field.type === "checkbox") {
        return (
            <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                    type="checkbox"
                    checked={!!value}
                    onChange={e => onChange(field.key, e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                />
                <span className="text-sm text-zinc-700">{value ? "Yes" : "No"}</span>
            </label>
        );
    }
    if (field.type === "dropdown") {
        return (
            <select value={value || ""} onChange={e => onChange(field.key, e.target.value)} className={base}>
                <option value="">— Select —</option>
                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }
    if (field.type === "textarea") {
        return (
            <textarea
                value={value || ""}
                onChange={e => onChange(field.key, e.target.value)}
                rows={3}
                className={`${base} resize-none`}
                placeholder={`Enter ${field.label.toLowerCase()}`}
            />
        );
    }
    const typeMap: Record<string, string> = {
        text: "text", number: "number", email: "email", phone: "tel", date: "date", url: "url",
    };
    return (
        <input
            type={typeMap[field.type] || "text"}
            value={value || ""}
            onChange={e => onChange(field.key, e.target.value)}
            className={base}
            placeholder={`Enter ${field.label.toLowerCase()}`}
        />
    );
}

// ─── Sort Header ──────────────────────────────────────────────────────────────

function SortTh({
    label, field, sortBy, sortOrder, onSort, className = ""
}: {
    label: string; field: SortField; sortBy: SortField; sortOrder: "asc" | "desc";
    onSort: (f: SortField) => void; className?: string;
}) {
    const active = sortBy === field;
    return (
        <th
            onClick={() => onSort(field)}
            className={`px-4 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer select-none hover:text-zinc-700 transition-colors ${className}`}
        >
            <span className="flex items-center gap-1">
                {label}
                {active
                    ? sortOrder === "asc"
                        ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
                        : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                    : <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-300" />
                }
            </span>
        </th>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContactsTab() {
    // Data
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [availableLists, setAvailableLists] = useState<ContactList[]>([]);
    const [availableTags, setAvailableTags] = useState<ContactTag[]>([]);
    const [loading, setLoading] = useState(true);

    // Column visibility
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
        // Safe default — localStorage read happens after hydration in useEffect
        const d: Record<string, boolean> = {};
        STATIC_COLUMNS.forEach(c => { d[c.key] = c.defaultVisible; });
        return d;
    });
    const [colMenuOpen, setColMenuOpen] = useState(false);
    const colMenuRef = useRef<HTMLDivElement>(null);

    // Pagination & filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [filterList, setFilterList] = useState("");
    const [filterTag, setFilterTag] = useState("");
    const [sortBy, setSortBy] = useState<SortField>("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
    const [bulkTargetLists, setBulkTargetLists] = useState<string[]>([]);
    const [bulkTargetTags, setBulkTargetTags] = useState<string[]>([]);

    // Modals
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editContact, setEditContact] = useState<Contact | null>(null);

    // Form state (shared add/edit)
    const [formName, setFormName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formCity, setFormCity] = useState("");
    const [formCompany, setFormCompany] = useState("");
    const [formWebsite, setFormWebsite] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formSource, setFormSource] = useState("Manual");
    const [formDob, setFormDob] = useState("");
    const [formLists, setFormLists] = useState<string[]>([]);
    const [formTags, setFormTags] = useState<string[]>([]);
    const [formCustom, setFormCustom] = useState<Record<string, any>>({});
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // ── Fetch ────────────────────────────────────────────────────────────────

    useEffect(() => { fetchMetadata(); }, []);

    useEffect(() => {
        const t = setTimeout(() => { fetchContacts(); }, 300);
        return () => clearTimeout(t);
    }, [page, search, filterList, filterTag, sortBy, sortOrder]);

    const fetchMetadata = async () => {
        try {
            const [listsRes, tagsRes, fieldsRes] = await Promise.all([
                fetch("/api/whatsapp/lists"),
                fetch("/api/whatsapp/tags"),
                fetch("/api/whatsapp/custom-fields"),
            ]);
            const [ld, td, fd] = await Promise.all([listsRes.json(), tagsRes.json(), fieldsRes.json()]);
            if (ld.lists) setAvailableLists(ld.lists);
            if (td.tags) setAvailableTags(td.tags);
            if (fd.fields) {
                setCustomFields(fd.fields);
                // Now that we have customFields, load localStorage prefs
                setVisibleCols(loadVisibleCols(fd.fields));
            }
        } catch (e) { console.error(e); }
    };

    // Click-outside closes column menu
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
                setColMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(), limit: limit.toString(),
                sortBy, sortOrder,
                ...(search && { search }),
                ...(filterList && { listId: filterList }),
                ...(filterTag && { tagId: filterTag }),
            });
            const res = await fetch(`/api/whatsapp/contacts?${params}`);
            const data = await res.json();
            if (data.contacts) {
                setContacts(data.contacts);
                setTotalPages(data.pagination?.pages || 1);
                setTotalCount(data.pagination?.total || 0);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [page, limit, search, filterList, filterTag, sortBy, sortOrder]);

    // ── Sort ─────────────────────────────────────────────────────────────────

    const handleSort = (field: SortField) => {
        if (sortBy === field) setSortOrder(o => o === "asc" ? "desc" : "asc");
        else { setSortBy(field); setSortOrder("asc"); }
        setPage(1);
    };

    // ── Column Toggle ─────────────────────────────────────────────────────────

    const toggleCol = (key: string) => {
        setVisibleCols(prev => {
            const next = { ...prev, [key]: !prev[key] };
            saveVisibleCols(next);
            return next;
        });
    };

    const hiddenCount = Object.values(visibleCols).filter(v => !v).length;

    // ── Selection ─────────────────────────────────────────────────────────────

    const allSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c._id));
    const someSelected = selectedIds.size > 0;

    const toggleAll = () => {
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(contacts.map(c => c._id)));
    };

    const toggleOne = (id: string) => {
        setSelectedIds(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    // ── Bulk Actions ──────────────────────────────────────────────────────────

    const executeBulk = async (action: BulkAction, extra?: { listIds?: string[]; tagIds?: string[] }) => {
        setBulkLoading(true);
        try {
            await fetch("/api/whatsapp/contacts/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    contactIds: Array.from(selectedIds),
                    ...extra,
                }),
            });
            setSelectedIds(new Set());
            setBulkAction(null);
            setBulkTargetLists([]);
            setBulkTargetTags([]);
            fetchContacts();
        } catch (e) { console.error(e); }
        finally { setBulkLoading(false); }
    };

    const handleBulkDelete = () => {
        if (!confirm(`Delete ${selectedIds.size} contact${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
        executeBulk("delete");
    };

    // ── Single Delete ─────────────────────────────────────────────────────────

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this contact?")) return;
        await fetch(`/api/whatsapp/contacts/${id}`, { method: "DELETE" });
        fetchContacts();
    };

    // ── Add/Edit Form helpers ─────────────────────────────────────────────────

    const resetForm = () => {
        setFormName(""); setFormEmail(""); setFormPhone(""); setFormCity("");
        setFormCompany(""); setFormWebsite(""); setFormNotes(""); setFormSource("Manual");
        setFormDob(""); setFormLists([]); setFormTags([]); setFormCustom({});
        setFormError(null);
    };

    const openAdd = () => { resetForm(); setIsAddOpen(true); };

    const openEdit = (c: Contact) => {
        setEditContact(c);
        setFormName(c.name); setFormEmail(c.email || ""); setFormPhone(c.phone);
        setFormCity(c.city || ""); setFormCompany(c.company || ""); setFormWebsite(c.website || "");
        setFormNotes(c.notes || ""); setFormSource(c.source || "Manual");
        setFormDob(c.dateOfBirth ? c.dateOfBirth.split("T")[0] : "");
        setFormLists(c.lists.map(l => l._id));
        setFormTags(c.tags.map(t => t._id));
        setFormCustom(c.customFieldValues || {});
        setFormError(null);
    };

    const closeModal = () => { setIsAddOpen(false); setEditContact(null); resetForm(); };

    const handleCustomChange = (key: string, val: any) => {
        setFormCustom(prev => ({ ...prev, [key]: val }));
    };

    const toggleFormList = (id: string) =>
        setFormLists(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);

    const toggleFormTag = (id: string) =>
        setFormTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormSaving(true);
        const payload = {
            name: formName, email: formEmail, phone: formPhone,
            city: formCity, company: formCompany, website: formWebsite,
            notes: formNotes, source: formSource,
            dateOfBirth: formDob || undefined,
            lists: formLists, tags: formTags, customFieldValues: formCustom,
        };
        try {
            const isEdit = !!editContact;
            const url = isEdit ? `/api/whatsapp/contacts/${editContact!._id}` : "/api/whatsapp/contacts";
            const method = isEdit ? "PUT" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) { setFormError(data.error || "Failed to save contact"); return; }
            closeModal();
            setPage(1);
            fetchContacts();
        } catch {
            setFormError("An error occurred");
        } finally {
            setFormSaving(false);
        }
    };

    // ── Render helpers ────────────────────────────────────────────────────────

    const pageNumbers = () => {
        const pages: (number | "...")[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push("...");
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    const isModalOpen = isAddOpen || !!editContact;

    // ─── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4 min-w-0 overflow-x-hidden">

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row justify-between gap-3 items-start lg:items-center bg-white p-4 rounded-2xl shadow-sm border border-zinc-200">
                <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-2">
                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search name, phone, email, city…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-4 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>
                    {/* Filters */}
                    <select
                        value={filterList}
                        onChange={e => { setFilterList(e.target.value); setPage(1); }}
                        className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                        <option value="">All Lists</option>
                        {availableLists.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                    </select>
                    <select
                        value={filterTag}
                        onChange={e => { setFilterTag(e.target.value); setPage(1); }}
                        className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                        <option value="">All Tags</option>
                        {availableTags.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                    {totalCount > 0 && (
                        <span className="text-sm text-zinc-400 font-medium whitespace-nowrap">
                            {totalCount} contact{totalCount !== 1 ? "s" : ""}
                        </span>
                    )}

                    {/* Columns Button + Popover */}
                    <div className="relative" ref={colMenuRef}>
                        <button
                            onClick={() => setColMenuOpen(o => !o)}
                            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${colMenuOpen
                                ? "bg-zinc-900 text-white border-zinc-900"
                                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                                }`}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Columns
                            {hiddenCount > 0 && (
                                <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                    {hiddenCount}
                                </span>
                            )}
                        </button>

                        {colMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 z-30 bg-white border border-zinc-200 rounded-2xl shadow-xl w-56 p-2">
                                {/* Header */}
                                <div className="flex items-center justify-between px-3 py-2 mb-1">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Show / Hide Columns</span>
                                    <button
                                        onClick={() => {
                                            const allOn: Record<string, boolean> = {};
                                            STATIC_COLUMNS.forEach(c => { allOn[c.key] = true; });
                                            customFields.forEach(cf => { allOn[`cf_${cf.key}`] = true; });
                                            setVisibleCols(allOn);
                                            saveVisibleCols(allOn);
                                        }}
                                        className="text-[10px] text-emerald-600 font-semibold hover:underline"
                                    >
                                        Show all
                                    </button>
                                </div>

                                {/* Static columns */}
                                {STATIC_COLUMNS.map(col => (
                                    <button
                                        key={col.key}
                                        onClick={() => toggleCol(col.key)}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors group"
                                    >
                                        <span className="text-sm text-zinc-700 font-medium">{col.label}</span>
                                        {visibleCols[col.key]
                                            ? <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                            : <EyeOff className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500" />
                                        }
                                    </button>
                                ))}

                                {/* Custom field columns */}
                                {customFields.length > 0 && (
                                    <>
                                        <div className="h-px bg-zinc-100 mx-3 my-1" />
                                        <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider px-3 pb-1">Custom Fields</p>
                                        {customFields.map(cf => (
                                            <button
                                                key={cf._id}
                                                onClick={() => toggleCol(`cf_${cf.key}`)}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors group"
                                            >
                                                <span className="text-sm text-zinc-700 font-medium truncate max-w-[140px]">{cf.label}</span>
                                                {visibleCols[`cf_${cf.key}`]
                                                    ? <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    : <EyeOff className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 shrink-0" />
                                                }
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={openAdd}
                        className="bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Contact
                    </button>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {someSelected && (
                <div className="flex flex-wrap items-center gap-2 bg-zinc-900 text-white rounded-2xl px-4 py-3 shadow-lg">
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-sm font-semibold bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">{selectedIds.size}</span>
                        <span className="text-sm font-medium">selected</span>
                    </div>
                    <div className="h-4 w-px bg-zinc-700 mx-1 hidden sm:block" />

                    {/* Assign to Lists */}
                    {bulkAction === "assignLists" ? (
                        <div className="flex items-center gap-2 flex-wrap bg-zinc-800 rounded-xl px-3 py-2">
                            <List className="w-4 h-4 text-zinc-400" />
                            <span className="text-xs text-zinc-300">Select lists:</span>
                            {availableLists.map(l => (
                                <button
                                    key={l._id}
                                    onClick={() => setBulkTargetLists(prev => prev.includes(l._id) ? prev.filter(x => x !== l._id) : [...prev, l._id])}
                                    className={`text-xs px-2 py-1 rounded-lg font-medium border transition-colors ${bulkTargetLists.includes(l._id) ? "bg-emerald-500 border-emerald-400 text-white" : "border-zinc-600 text-zinc-300 hover:border-zinc-400"}`}
                                >
                                    {l.name}
                                </button>
                            ))}
                            <button onClick={() => executeBulk("assignLists", { listIds: bulkTargetLists })} disabled={bulkTargetLists.length === 0 || bulkLoading} className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs px-3 py-1 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1">
                                {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                            </button>
                            <button onClick={() => setBulkAction(null)} className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded-lg">Cancel</button>
                        </div>
                    ) : (
                        <button onClick={() => setBulkAction("assignLists")} className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                            <List className="w-3.5 h-3.5" /> Assign Lists
                        </button>
                    )}

                    {/* Assign Tags */}
                    {bulkAction === "assignTags" ? (
                        <div className="flex items-center gap-2 flex-wrap bg-zinc-800 rounded-xl px-3 py-2">
                            <Tags className="w-4 h-4 text-zinc-400" />
                            <span className="text-xs text-zinc-300">Select tags:</span>
                            {availableTags.map(t => {
                                const c = parseColor(t.color);
                                return (
                                    <button
                                        key={t._id}
                                        onClick={() => setBulkTargetTags(prev => prev.includes(t._id) ? prev.filter(x => x !== t._id) : [...prev, t._id])}
                                        className="text-xs px-2 py-1 rounded font-bold border-2 transition-all"
                                        style={{
                                            backgroundColor: c.value, color: c.text,
                                            borderColor: bulkTargetTags.includes(t._id) ? c.text : "transparent",
                                            opacity: bulkTargetTags.includes(t._id) ? 1 : 0.65,
                                        }}
                                    >
                                        {t.name}
                                    </button>
                                );
                            })}
                            <button onClick={() => executeBulk("assignTags", { tagIds: bulkTargetTags })} disabled={bulkTargetTags.length === 0 || bulkLoading} className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs px-3 py-1 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1">
                                {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                            </button>
                            <button onClick={() => setBulkAction(null)} className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded-lg">Cancel</button>
                        </div>
                    ) : (
                        <button onClick={() => setBulkAction("assignTags")} className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                            <Tags className="w-3.5 h-3.5" /> Assign Tags
                        </button>
                    )}

                    <button
                        onClick={handleBulkDelete}
                        disabled={bulkLoading}
                        className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-colors ml-auto disabled:opacity-50"
                    >
                        {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Delete Selected
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-700 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                {loading && contacts.length === 0 ? (
                    <div className="flex justify-center items-center h-72">
                        <Loader2 className="w-7 h-7 animate-spin text-zinc-300" />
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-72 text-zinc-400">
                        <UserPlus className="w-10 h-10 mb-3 text-zinc-200" />
                        <p className="font-medium text-zinc-500">No contacts found</p>
                        <p className="text-sm mt-1">Try adjusting your search or add a new contact.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-zinc-50 border-b border-zinc-200">
                                    {/* Checkbox col — always visible */}
                                    <th className="px-4 py-3.5 w-10">
                                        <button onClick={toggleAll} className="text-zinc-400 hover:text-zinc-700">
                                            {allSelected
                                                ? <CheckSquare className="w-4 h-4 text-emerald-600" />
                                                : <Square className="w-4 h-4" />
                                            }
                                        </button>
                                    </th>
                                    {/* Name — always visible */}
                                    <SortTh label="Name" field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                    {/* Conditional columns */}
                                    {visibleCols["contact"] && (
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Phone / Email</th>
                                    )}
                                    {visibleCols["city"] && (
                                        <SortTh label="City" field="city" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                    )}
                                    {visibleCols["company"] && (
                                        <SortTh label="Company" field="company" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                    )}
                                    {visibleCols["source"] && (
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Source</th>
                                    )}
                                    {visibleCols["listsAndTags"] && (
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Lists / Tags</th>
                                    )}
                                    {/* Custom field columns — each individually toggled */}
                                    {customFields.map(cf => visibleCols[`cf_${cf.key}`] && (
                                        <th key={cf._id} className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            {cf.label}
                                        </th>
                                    ))}
                                    {visibleCols["createdAt"] && (
                                        <SortTh label="Added" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                    )}
                                    {/* Actions — always visible */}
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {contacts.map(c => (
                                    <tr key={c._id} className={`hover:bg-zinc-50/80 transition-colors group ${selectedIds.has(c._id) ? "bg-emerald-50/50" : ""}`}>
                                        {/* Checkbox */}
                                        <td className="px-4 py-3.5">
                                            <button onClick={() => toggleOne(c._id)} className="text-zinc-400 hover:text-zinc-700">
                                                {selectedIds.has(c._id)
                                                    ? <CheckSquare className="w-4 h-4 text-emerald-600" />
                                                    : <Square className="w-4 h-4" />
                                                }
                                            </button>
                                        </td>
                                        {/* Name — always visible */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-zinc-900 leading-tight">{c.name}</div>
                                                    {c.source && c.source !== "Manual" && (
                                                        <span className="text-[10px] bg-violet-50 text-violet-600 border border-violet-200 px-1.5 py-0.5 rounded font-medium">{c.source}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {/* Contact */}
                                        {visibleCols["contact"] && (
                                            <td className="px-4 py-3.5">
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-1.5 text-zinc-600 text-xs"><Phone className="w-3 h-3 shrink-0" />{c.phone}</div>
                                                    {c.email && <div className="flex items-center gap-1.5 text-zinc-500 text-xs"><Mail className="w-3 h-3 shrink-0" />{c.email}</div>}
                                                </div>
                                            </td>
                                        )}
                                        {/* City */}
                                        {visibleCols["city"] && (
                                            <td className="px-4 py-3.5 text-sm text-zinc-500">{c.city || <span className="text-zinc-300 italic text-xs">—</span>}</td>
                                        )}
                                        {/* Company */}
                                        {visibleCols["company"] && (
                                            <td className="px-4 py-3.5 text-sm text-zinc-500">{c.company || <span className="text-zinc-300 italic text-xs">—</span>}</td>
                                        )}
                                        {/* Source */}
                                        {visibleCols["source"] && (
                                            <td className="px-4 py-3.5 text-sm text-zinc-500">
                                                {c.source
                                                    ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.source === "Manual" ? "bg-zinc-100 text-zinc-500" :
                                                            c.source === "Import" ? "bg-blue-50 text-blue-600" :
                                                                c.source === "Chatbot" ? "bg-emerald-50 text-emerald-700" :
                                                                    "bg-violet-50 text-violet-600"
                                                        }`}>{c.source}</span>
                                                    : <span className="text-zinc-300 italic text-xs">—</span>
                                                }
                                            </td>
                                        )}
                                        {/* Lists / Tags */}
                                        {visibleCols["listsAndTags"] && (
                                            <td className="px-4 py-3.5">
                                                <div className="space-y-1 max-w-[200px]">
                                                    {c.lists.length > 0 && (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {c.lists.map(l => (
                                                                <span key={l._id} className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 text-[10px] font-semibold uppercase tracking-wide">{l.name}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {c.tags.length > 0 && (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {c.tags.map(t => {
                                                                const cl = parseColor(t.color);
                                                                return (
                                                                    <span key={t._id} className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: cl.value, color: cl.text, border: `1px solid ${cl.border}` }}>{t.name}</span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {c.lists.length === 0 && c.tags.length === 0 && <span className="text-zinc-300 italic text-xs">—</span>}
                                                </div>
                                            </td>
                                        )}
                                        {/* Custom fields — all, each individually toggled */}
                                        {customFields.map(cf => visibleCols[`cf_${cf.key}`] && (
                                            <td key={cf._id} className="px-4 py-3.5 text-sm text-zinc-500">
                                                {cf.type === "checkbox"
                                                    ? (c.customFieldValues?.[cf.key] ? <span className="text-emerald-600 font-semibold">✓</span> : <span className="text-zinc-300">✗</span>)
                                                    : c.customFieldValues?.[cf.key]
                                                        ? <span className="truncate max-w-[140px] block">{String(c.customFieldValues[cf.key])}</span>
                                                        : <span className="text-zinc-300 italic text-xs">—</span>
                                                }
                                            </td>
                                        ))}
                                        {/* Date Added */}
                                        {visibleCols["createdAt"] && (
                                            <td className="px-4 py-3.5 text-xs text-zinc-400 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                                        )}
                                        {/* Actions */}
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEdit(c)}
                                                    className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="Edit contact"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c._id)}
                                                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete contact"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 0 && totalCount > 0 && (
                    <div className="px-5 py-3.5 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-50/50">
                        <span className="text-xs text-zinc-500 font-medium">
                            Showing {Math.min((page - 1) * limit + 1, totalCount)}–{Math.min(page * limit, totalCount)} of {totalCount} contacts
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 border border-zinc-200 text-zinc-600 rounded-lg bg-white disabled:opacity-40 hover:bg-zinc-100 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {pageNumbers().map((n, i) =>
                                n === "..." ? (
                                    <span key={`dots-${i}`} className="px-2 text-zinc-400 text-sm">…</span>
                                ) : (
                                    <button
                                        key={n}
                                        onClick={() => setPage(n as number)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === n ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100 border border-zinc-200 bg-white"}`}
                                    >
                                        {n}
                                    </button>
                                )
                            )}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 border border-zinc-200 text-zinc-600 rounded-lg bg-white disabled:opacity-40 hover:bg-zinc-100 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                                {editContact ? <Pencil className="w-4 h-4 text-emerald-600" /> : <UserPlus className="w-4 h-4 text-emerald-600" />}
                                {editContact ? "Edit Contact" : "Add New Contact"}
                            </h2>
                            <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 p-2 rounded-full transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5">
                            <form id="contact-form" onSubmit={handleSave} className="space-y-6">

                                {/* Core Fields */}
                                <section>
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Contact Info</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-700 block mb-1.5">Full Name *</label>
                                            <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="John Doe"
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-700 block mb-1.5"><Phone className="w-3 h-3 inline mr-1" />Phone *</label>
                                                <input type="text" required value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="919876543210"
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-700 block mb-1.5"><Mail className="w-3 h-3 inline mr-1" />Email</label>
                                                <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="john@example.com"
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Additional Details */}
                                <section>
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Additional Details</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-700 block mb-1.5"><MapPin className="w-3 h-3 inline mr-1" />City</label>
                                            <input type="text" value={formCity} onChange={e => setFormCity(e.target.value)} placeholder="Mumbai"
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-700 block mb-1.5"><Building2 className="w-3 h-3 inline mr-1" />Company</label>
                                            <input type="text" value={formCompany} onChange={e => setFormCompany(e.target.value)} placeholder="Acme Corp"
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-700 block mb-1.5"><Globe className="w-3 h-3 inline mr-1" />Website</label>
                                            <input type="url" value={formWebsite} onChange={e => setFormWebsite(e.target.value)} placeholder="https://example.com"
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-700 block mb-1.5"><Calendar className="w-3 h-3 inline mr-1" />Date of Birth</label>
                                            <input type="date" value={formDob} onChange={e => setFormDob(e.target.value)}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-700 block mb-1.5"><Zap className="w-3 h-3 inline mr-1" />Source</label>
                                            <select value={formSource} onChange={e => setFormSource(e.target.value)}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                                                {["Manual", "Import", "Chatbot", "Campaign", "API", "Referral", "Other"].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="text-xs font-semibold text-zinc-700 block mb-1.5"><FileText className="w-3 h-3 inline mr-1" />Notes</label>
                                            <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} placeholder="Internal notes about this contact…"
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none" />
                                        </div>
                                    </div>
                                </section>

                                {/* Custom Fields */}
                                {customFields.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <Settings2 className="w-3.5 h-3.5" /> Custom Fields
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {customFields.map(cf => (
                                                <div key={cf._id} className={cf.type === "textarea" ? "sm:col-span-2" : ""}>
                                                    <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                                                        <Hash className="w-3 h-3 inline mr-1 text-zinc-400" />
                                                        {cf.label}{cf.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                                                    </label>
                                                    <CustomFieldInput
                                                        field={cf}
                                                        value={formCustom[cf.key] ?? ""}
                                                        onChange={handleCustomChange}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Lists */}
                                {availableLists.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><List className="w-3.5 h-3.5" /> Assign to Lists</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {availableLists.map(l => (
                                                <button type="button" key={l._id} onClick={() => toggleFormList(l._id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide border transition-all ${formLists.includes(l._id) ? "bg-zinc-900 text-white border-zinc-900 shadow" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"}`}>
                                                    {l.name}
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Tags */}
                                {availableTags.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Tags className="w-3.5 h-3.5" /> Assign Tags</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {availableTags.map(t => {
                                                const cl = parseColor(t.color);
                                                const sel = formTags.includes(t._id);
                                                return (
                                                    <button type="button" key={t._id} onClick={() => toggleFormTag(t._id)}
                                                        className="px-3 py-1.5 rounded text-xs font-bold border-2 transition-all"
                                                        style={{ backgroundColor: cl.value, color: cl.text, borderColor: sel ? cl.text : "transparent", opacity: sel ? 1 : 0.55 }}>
                                                        {t.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}

                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/80 flex items-center justify-between gap-3 shrink-0">
                            {formError && (
                                <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {formError}
                                </div>
                            )}
                            <div className="flex gap-2 ml-auto">
                                <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-200/60 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" form="contact-form" disabled={formSaving || !formName || !formPhone}
                                    className="bg-emerald-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2">
                                    {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editContact ? <Pencil className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />)}
                                    {editContact ? "Save Changes" : "Add Contact"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
