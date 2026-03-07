"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Search, Send, CheckCheck, Check, Clock, Image as ImageIcon,
    Video, FileText, Music, Archive, ArchiveRestore, ChevronDown, MessageSquare,
    Loader2, X, RefreshCw, Bell, BellOff, Volume2, VolumeX
} from "lucide-react";
import { WhatsAppTemplate } from "@/models/WhatsAppTemplateTypes";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
    _id: string;
    contactPhone: string;
    contactName: string;
    contactProfilePic?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    status: "open" | "archived";
}

interface ChatMsg {
    _id: string;
    wamId?: string;
    direction: "inbound" | "outbound";
    type: string;
    body: string;
    mediaUrl?: string;
    templateName?: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: string;
    _optimistic?: boolean; // flag for optimistic UI
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
    return name.replace(/\+/g, "").split(/[\s]/).filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function StatusIcon({ status }: { status: ChatMsg["status"] }) {
    if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
    if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />;
    if (status === "sent") return <Check className="w-3.5 h-3.5 text-zinc-400" />;
    if (status === "failed") return <X className="w-3.5 h-3.5 text-red-400" />;
    return <Clock className="w-3 h-3 text-zinc-300 animate-pulse" />;
}

function MsgTypeIcon({ type }: { type: string }) {
    if (type === "image") return <ImageIcon className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />;
    if (type === "video") return <Video className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />;
    if (type === "audio") return <Music className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />;
    if (type === "document") return <FileText className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />;
    return null;
}

function extractTemplateVars(template: WhatsAppTemplate | undefined) {
    if (!template) return [];
    const vars: { id: string; label: string }[] = [];
    template.components.forEach(comp => {
        const matches = comp.text?.match(/\{\{(\d+)\}\}/g) ?? [];
        matches.forEach(m => {
            const n = m.replace(/[{}]/g, "");
            vars.push({ id: `${comp.type}_${n}`, label: `${comp.type} {{${n}}}` });
        });
    });
    return vars;
}

// ─── Sound helper ─────────────────────────────────────────────────────────────
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch { /* ignore if AudioContext not available */ }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatTab() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [convLoading, setConvLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [msgLoading, setMsgLoading] = useState(false);

    // View state: open or archived
    const [chatView, setChatView] = useState<"open" | "archived">("open");

    // Refs to always have latest values in intervals (avoids stale closure bug)
    const activeConvRef = useRef<Conversation | null>(null);
    const messagesRef = useRef<ChatMsg[]>([]);
    const lastMsgCountRef = useRef(0);
    const lastConvRef = useRef<Conversation[]>([]);
    const convPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const msgPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const chatViewRef = useRef<"open" | "archived">("open");

    // Notifications
    const [soundOn, setSoundOn] = useState(true);
    const [notifOn, setNotifOn] = useState(false);

    // Composer
    const [composeTab, setComposeTab] = useState<"text" | "template">("text");
    const [textInput, setTextInput] = useState("");
    const [sending, setSending] = useState(false);

    // Template
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({});

    // Sync/debug
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const atBottomRef = useRef(true);
    const msgScrollRef = useRef<HTMLDivElement>(null);

    // Keep refs in sync
    useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { chatViewRef.current = chatView; }, [chatView]);

    // ── Fetch conversations ──────────────────────────────────────────────────
    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch(`/api/whatsapp/conversations?status=${chatViewRef.current}`);
            const data = await res.json();
            if (!data.success) { setFetchError(data.error || "Error"); return; }
            setFetchError(null);

            const incoming: Conversation[] = data.conversations;

            // Detect new inbound messages from the conversation list
            const prev = lastConvRef.current;
            for (const c of incoming) {
                const prevC = prev.find(p => p._id === c._id);
                if (c.unreadCount > 0 && (!prevC || c.unreadCount > prevC.unreadCount) && c._id !== activeConvRef.current?._id) {
                    if (soundOn) playNotificationSound();
                    if (notifOn && Notification.permission === "granted") {
                        new Notification(`New message from ${c.contactName || c.contactPhone}`, {
                            body: c.lastMessage,
                            icon: "/favicon.ico"
                        });
                    }
                    document.title = `(${c.unreadCount}) WhatsApp Inbox`;
                }
            }
            lastConvRef.current = incoming;
            setConversations(incoming);
        } catch (e: any) {
            setFetchError(e.message);
        } finally {
            setConvLoading(false);
        }
    }, [soundOn, notifOn]);

    // ── Fetch messages ───────────────────────────────────────────────────────
    const fetchMessages = useCallback(async (convId: string, silent = false) => {
        if (!silent) setMsgLoading(true);
        try {
            const res = await fetch(`/api/whatsapp/conversations/${convId}/messages`);
            const data = await res.json();
            if (!data.success) return;

            const incoming: ChatMsg[] = data.messages;

            // Detect truly new inbound messages via count change
            const prevCount = lastMsgCountRef.current;
            const newInbound = incoming.filter(m => m.direction === "inbound");

            if (newInbound.length > prevCount && prevCount > 0) {
                if (soundOn) playNotificationSound();
            }
            lastMsgCountRef.current = newInbound.length;

            // Merge optimistic messages that haven't been confirmed yet
            setMessages(prev => {
                const optimisticPending = prev.filter(m => m._optimistic);
                // Remove optimistic ones that now appear in the real list
                const realIds = new Set(incoming.map(m => m._id));
                const stillPending = optimisticPending.filter(m => !realIds.has(m._id));
                return [...incoming, ...stillPending];
            });
        } finally {
            if (!silent) setMsgLoading(false);
        }
    }, [soundOn]);

    // ── Templates ────────────────────────────────────────────────────────────
    useEffect(() => {
        fetch("/api/whatsapp/templates").then(r => r.json()).then(d => {
            if (d.success) setTemplates(d.templates);
        });
    }, []);

    // ── Start conversation polling (runs once) ────────────────────────────────
    useEffect(() => {
        setConvLoading(true);
        setActiveConv(null); // Deselect on tab change
        fetchConversations();
        if (convPollingRef.current) clearInterval(convPollingRef.current);
        convPollingRef.current = setInterval(fetchConversations, 4000);
        return () => { if (convPollingRef.current) clearInterval(convPollingRef.current); };
    }, [chatView, fetchConversations]);

    // ── Message polling — restart on active conversation change ───────────────
    useEffect(() => {
        if (msgPollingRef.current) clearInterval(msgPollingRef.current);
        lastMsgCountRef.current = 0;
        if (!activeConv) return;

        fetchMessages(activeConv._id);
        msgPollingRef.current = setInterval(() => {
            // Always use the REF value to avoid stale closure
            if (activeConvRef.current) fetchMessages(activeConvRef.current._id, true);
        }, 2000); // 2s for near-instant feel

        return () => { if (msgPollingRef.current) clearInterval(msgPollingRef.current); };
    }, [activeConv?._id]); // only dep is the ID string — avoids object reference churn

    // ── Re-fetch immediately when tab becomes visible ─────────────────────────
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                fetchConversations();
                if (activeConvRef.current) fetchMessages(activeConvRef.current._id, true);
            } else {
                // Reset title when leaving
                document.title = "WhatsApp Inbox";
            }
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [fetchConversations, fetchMessages]);

    // ── Auto-scroll only if user is at bottom ─────────────────────────────────
    useEffect(() => {
        if (atBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    // ── Open conversation ────────────────────────────────────────────────────
    const openConversation = async (conv: Conversation) => {
        setActiveConv(conv);
        setMessages([]);
        lastMsgCountRef.current = 0;
        setTextInput("");
        setSelectedTemplate("");
        setComposeTab("text");
        atBottomRef.current = true;
        document.title = "WhatsApp Inbox";
        if (conv.unreadCount > 0) {
            fetch(`/api/whatsapp/conversations/${conv._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markRead: true })
            });
            setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unreadCount: 0 } : c));
        }
    };

    // ── Send text (optimistic UI) ────────────────────────────────────────────
    const handleSendText = async () => {
        if (!activeConv || !textInput.trim() || sending) return;
        setSending(true);
        const text = textInput.trim();
        setTextInput("");
        atBottomRef.current = true;

        // Optimistic message
        const tempId = `opt_${Date.now()}`;
        const optimisticMsg: ChatMsg = {
            _id: tempId,
            direction: "outbound",
            type: "text",
            body: text,
            status: "sent",
            timestamp: new Date().toISOString(),
            _optimistic: true
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await fetch(`/api/whatsapp/conversations/${activeConv._id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "text", text })
            });
            const data = await res.json();
            if (data.success) {
                // Replace optimistic with real message
                setMessages(prev => prev.map(m => m._id === tempId ? data.message : m));
                // Update conversation last message locally
                setConversations(prev => prev.map(c => c._id === activeConv._id
                    ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() } : c));
            } else {
                setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: "failed", _optimistic: false } : m));
            }
        } catch {
            setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: "failed", _optimistic: false } : m));
        } finally {
            setSending(false);
        }
    };

    // ── Send template ────────────────────────────────────────────────────────
    const handleSendTemplate = async () => {
        if (!activeConv || !selectedTemplate || sending) return;
        const tmpl = templates.find(t => t.name === selectedTemplate);
        if (!tmpl) return;

        const components: any[] = [];
        const bodyParams: any[] = [];
        const headerParams: any[] = [];
        Object.entries(templateVarValues).forEach(([key, value]) => {
            if (key.startsWith("BODY_")) bodyParams[parseInt(key.replace("BODY_", "")) - 1] = { type: "text", text: value };
            if (key.startsWith("HEADER_")) headerParams[parseInt(key.replace("HEADER_", "")) - 1] = { type: "text", text: value };
        });
        if (headerParams.filter(Boolean).length > 0) components.push({ type: "header", parameters: headerParams.filter(Boolean) });
        if (bodyParams.filter(Boolean).length > 0) components.push({ type: "body", parameters: bodyParams.filter(Boolean) });

        setSending(true);
        atBottomRef.current = true;

        // Optimistic
        const tempId = `opt_${Date.now()}`;
        setMessages(prev => [...prev, {
            _id: tempId, direction: "outbound", type: "template",
            body: `[Template: ${selectedTemplate}]`, templateName: selectedTemplate,
            status: "sent", timestamp: new Date().toISOString(), _optimistic: true
        }]);

        try {
            const res = await fetch(`/api/whatsapp/conversations/${activeConv._id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "template", templateName: selectedTemplate, templateLanguage: tmpl.language, templateComponents: components })
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => prev.map(m => m._id === tempId ? data.message : m));
                setSelectedTemplate("");
                setTemplateVarValues({});
            } else {
                setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: "failed", _optimistic: false } : m));
            }
        } catch {
            setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: "failed", _optimistic: false } : m));
        } finally {
            setSending(false);
        }
    };

    const handleTemplateSelect = (name: string) => {
        setSelectedTemplate(name);
        const tmpl = templates.find(t => t.name === name);
        const vars = extractTemplateVars(tmpl);
        const init: Record<string, string> = {};
        vars.forEach(v => { init[v.id] = ""; });
        setTemplateVarValues(init);
    };

    // Browser notifications permission
    const requestNotif = async () => {
        if (Notification.permission === "default") {
            const perm = await Notification.requestPermission();
            if (perm === "granted") setNotifOn(true);
        } else if (Notification.permission === "granted") {
            setNotifOn(n => !n);
        }
    };

    // Sync handler
    const handleSync = async () => {
        setSyncLoading(true); setSyncResult(null);
        try {
            const d = await fetch("/api/whatsapp/conversations/sync").then(r => r.json());
            const total = d.total?.conversationCount ?? 0;
            const filtered = d.filtered?.conversationCount ?? 0;
            let info = `DB Total: ${total} conversations, ${d.total?.chatMessageCount ?? 0} messages\n`;
            info += `Matched your account: ${filtered}\n`;
            if (d.sampleConversations?.length > 0) {
                info += `Stored educatorIds: ${d.sampleConversations.map((c: any) => String(c.educatorId)).join(", ")}`;
            }
            if (total > 0 && filtered < total) {
                const sync = await fetch("/api/whatsapp/conversations/sync", { method: "POST" }).then(r => r.json());
                info += `\n${sync.message}`;
                await fetchConversations();
            } else if (filtered > 0) {
                info += "\n✅ All matched. Refreshing...";
                await fetchConversations();
            }
            setSyncResult(info);
        } catch (e: any) { setSyncResult(`Error: ${e.message}`); }
        finally { setSyncLoading(false); }
    };

    const selectedTemplateObj = templates.find(t => t.name === selectedTemplate);
    const templateVars = extractTemplateVars(selectedTemplateObj);
    const filtered = conversations.filter(c =>
        c.contactName.toLowerCase().includes(search.toLowerCase()) || c.contactPhone.includes(search)
    );
    const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

    return (
        <div className="flex h-[calc(100vh-120px)] min-h-[600px] bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

            {/* ── LEFT PANEL ──────────────────────────────────────────────── */}
            <div className={`flex flex-col border-r border-zinc-100 bg-white ${activeConv ? "hidden md:flex w-[340px] flex-shrink-0" : "flex flex-1 md:w-[340px] md:flex-shrink-0 md:flex-none"}`}>

                {/* Header */}
                <div className="px-4 py-3 bg-[#f0f2f5] flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">WA</div>
                        <div>
                            <h2 className="text-sm font-bold text-zinc-900">Inbox</h2>
                            {totalUnread > 0 && chatView === "open" && <p className="text-[11px] text-emerald-600 font-medium">{totalUnread} unread</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setSoundOn(s => !s)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors" title={soundOn ? "Mute sounds" : "Unmute sounds"}>
                            {soundOn ? <Volume2 className="w-4 h-4 text-zinc-500" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
                        </button>
                        <button onClick={requestNotif} className="p-2 hover:bg-zinc-200 rounded-full transition-colors" title="Browser notifications">
                            {notifOn ? <Bell className="w-4 h-4 text-emerald-600" /> : <BellOff className="w-4 h-4 text-zinc-400" />}
                        </button>
                        <button onClick={fetchConversations} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                            <RefreshCw className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="px-3 py-2 bg-[#f0f2f5] flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search chats"
                            className="w-full bg-white rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-700 focus:outline-none"
                        />
                    </div>
                    {/* Tabs */}
                    <div className="flex bg-zinc-200/50 p-0.5 rounded-lg mt-2">
                        <button onClick={() => setChatView("open")}
                            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${chatView === "open" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
                            Open
                        </button>
                        <button onClick={() => setChatView("archived")}
                            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${chatView === "archived" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
                            Archived
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {convLoading ? (
                        <div className="flex items-center justify-center h-32 text-zinc-400 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center px-5 gap-4">
                            <MessageSquare className="w-10 h-10 text-zinc-200" />
                            <div>
                                <p className="text-sm font-medium text-zinc-500">No conversations yet</p>
                                <p className="text-xs text-zinc-400 mt-1">Customers who WhatsApp you appear here</p>
                            </div>
                            {fetchError && (
                                <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 w-full text-left">⚠️ {fetchError}</div>
                            )}
                            <button onClick={handleSync} disabled={syncLoading}
                                className="flex items-center gap-2 bg-zinc-800 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-60">
                                {syncLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                {syncLoading ? "Checking…" : "Diagnose & Sync"}
                            </button>
                            {syncResult && (
                                <div className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 text-left whitespace-pre-line w-full">{syncResult}</div>
                            )}
                        </div>
                    ) : (
                        filtered.map(conv => (
                            <button key={conv._id} onClick={() => openConversation(conv)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors border-b border-zinc-50 text-left ${activeConv?._id === conv._id ? "bg-[#f0f2f5]" : ""}`}>
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm flex-shrink-0 overflow-hidden">
                                    {conv.contactProfilePic
                                        ? <img src={conv.contactProfilePic} alt="" className="w-full h-full object-cover" />
                                        : <span>{initials(conv.contactName || conv.contactPhone)}</span>}
                                </div>
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-sm font-semibold text-zinc-900 truncate">
                                            {conv.contactName && conv.contactName !== conv.contactPhone ? conv.contactName : `+${conv.contactPhone}`}
                                        </span>
                                        <span className="text-[11px] text-zinc-400 flex-shrink-0 ml-2">{formatTime(conv.lastMessageAt)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-zinc-500 truncate">{conv.lastMessage || "…"}</p>
                                        {conv.unreadCount > 0 && (
                                            <span className="ml-2 min-w-[20px] h-5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL ─────────────────────────────────────────────── */}
            {activeConv ? (
                <div className="flex flex-col flex-1 min-w-0">
                    {/* Chat Header */}
                    <div className="px-4 py-3 bg-[#f0f2f5] flex items-center gap-3 border-b border-zinc-200 flex-shrink-0 shadow-sm">
                        <button onClick={() => setActiveConv(null)} className="md:hidden p-1 hover:bg-zinc-200 rounded-full mr-1">
                            <ChevronDown className="w-5 h-5 text-zinc-600 rotate-90" />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm flex-shrink-0">
                            {initials(activeConv.contactName || activeConv.contactPhone)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-900 truncate">
                                {activeConv.contactName && activeConv.contactName !== activeConv.contactPhone ? activeConv.contactName : `+${activeConv.contactPhone}`}
                            </p>
                            <p className="text-xs text-zinc-500">+{activeConv.contactPhone}</p>
                        </div>
                        <button
                            onClick={() => {
                                const newStatus = activeConv.status === "open" ? "archived" : "open";
                                fetch(`/api/whatsapp/conversations/${activeConv._id}`, {
                                    method: "PATCH", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: newStatus })
                                });
                                setConversations(prev => prev.filter(c => c._id !== activeConv._id));
                                setActiveConv(null);
                            }}
                            className="p-2 hover:bg-zinc-200 rounded-full transition-colors focus:outline-none"
                            title={activeConv.status === "open" ? "Archive" : "Unarchive"}
                        >
                            {activeConv.status === "open" ? <Archive className="w-4 h-4 text-zinc-500" /> : <ArchiveRestore className="w-4 h-4 text-emerald-600" />}
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        ref={msgScrollRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e8f5e9' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", backgroundColor: "#efeae2" }}
                    >
                        {msgLoading ? (
                            <div className="flex justify-center pt-10"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
                        ) : messages.length === 0 ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="bg-white/80 backdrop-blur rounded-2xl px-6 py-4 shadow-sm text-center">
                                    <p className="text-sm text-zinc-500">No messages yet</p>
                                    <p className="text-xs text-zinc-400 mt-1">Send a message below to start</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, idx) => {
                                    const isOut = msg.direction === "outbound";
                                    const showDate = idx === 0 || new Date(msg.timestamp).toDateString() !== new Date(messages[idx - 1].timestamp).toDateString();
                                    return (
                                        <div key={msg._id}>
                                            {showDate && (
                                                <div className="flex justify-center my-3">
                                                    <span className="bg-white/80 text-zinc-500 text-[11px] px-3 py-1 rounded-full shadow-sm">
                                                        {new Date(msg.timestamp).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex ${isOut ? "justify-end" : "justify-start"} mb-0.5 ${msg._optimistic ? "opacity-80" : ""}`}>
                                                <div className={`relative max-w-[72%] md:max-w-[60%] px-3 py-1.5 rounded-2xl shadow-sm ${isOut ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"}`}>
                                                    {msg.type === "template" && msg.templateName && (
                                                        <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Template: {msg.templateName}
                                                        </div>
                                                    )}
                                                    {["image", "video", "audio", "document"].includes(msg.type) && (
                                                        <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-2 mb-1">
                                                            <MsgTypeIcon type={msg.type} />
                                                            <span className="text-xs text-zinc-600 capitalize">{msg.type}</span>
                                                        </div>
                                                    )}
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                                                    <div className={`flex items-center gap-1 mt-0.5 ${isOut ? "justify-end" : "justify-start"}`}>
                                                        <span className="text-[10px] text-zinc-400">
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                        {isOut && <StatusIcon status={msg.status} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Composer */}
                    <div className="bg-[#f0f2f5] border-t border-zinc-200 flex-shrink-0">
                        <div className="flex items-center gap-1 px-4 pt-2.5 pb-1">
                            <button onClick={() => setComposeTab("text")}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${composeTab === "text" ? "bg-emerald-600 text-white" : "text-zinc-500 hover:bg-zinc-200"}`}>
                                Message
                            </button>
                            <button onClick={() => setComposeTab("template")}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${composeTab === "template" ? "bg-emerald-600 text-white" : "text-zinc-500 hover:bg-zinc-200"}`}>
                                Template
                            </button>
                        </div>

                        {composeTab === "text" && (
                            <div className="flex items-end gap-2 px-3 pb-4 pt-1">
                                <div className="flex-1 bg-white rounded-2xl px-4 py-2.5 shadow-sm">
                                    <textarea
                                        value={textInput}
                                        onChange={e => setTextInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                                        placeholder="Type a message"
                                        rows={1}
                                        className="w-full text-sm text-zinc-800 resize-none focus:outline-none max-h-32 overflow-y-auto bg-transparent leading-relaxed"
                                        style={{ minHeight: "24px" }}
                                    />
                                </div>
                                <button onClick={handleSendText} disabled={!textInput.trim() || sending}
                                    className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 flex items-center justify-center transition-all shadow-sm flex-shrink-0">
                                    {sending ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
                                </button>
                            </div>
                        )}

                        {composeTab === "template" && (
                            <div className="px-4 pb-4 pt-1 space-y-2.5">
                                <select value={selectedTemplate} onChange={e => handleTemplateSelect(e.target.value)}
                                    className="w-full bg-white rounded-xl px-4 py-2.5 text-sm text-zinc-700 focus:outline-none shadow-sm border-0">
                                    <option value="">Select a template…</option>
                                    {templates.map(t => <option key={t.name} value={t.name}>{t.name} ({t.language})</option>)}
                                </select>

                                {selectedTemplate && selectedTemplateObj && (
                                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                                            {selectedTemplateObj.components.map((comp, i) => (
                                                <div key={i} className="text-xs text-zinc-700 mb-0.5">
                                                    {comp.format && comp.format !== "TEXT"
                                                        ? <span className="text-zinc-400 italic">[{comp.format}]</span>
                                                        : <span className={comp.type === "HEADER" ? "font-bold" : ""}>{comp.text}</span>}
                                                </div>
                                            ))}
                                        </div>
                                        {templateVars.length > 0 && (
                                            <div className="px-4 py-3 space-y-2">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Variables</p>
                                                {templateVars.map(v => (
                                                    <div key={v.id} className="flex items-center gap-3">
                                                        <span className="text-xs text-zinc-500 w-24 flex-shrink-0">{v.label}:</span>
                                                        <input type="text" value={templateVarValues[v.id] || ""}
                                                            onChange={e => setTemplateVarValues(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                            placeholder={`Value`}
                                                            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button onClick={handleSendTemplate} disabled={!selectedTemplate || sending}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm">
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {sending ? "Sending…" : "Send Template"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#f8f9fa] text-center px-8">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
                        <MessageSquare className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-800 mb-2">WhatsApp Inbox</h3>
                    <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
                        Select a conversation from the left to view messages and reply.
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-left max-w-sm w-full">
                        {[
                            ["🔔", "Sound alerts", "Plays a tone on new messages"],
                            ["📳", "Browser notifications", "Get alerts even in other tabs"],
                            ["⚡", "2s polling", "Near-instant message updates"],
                            ["✅", "Delivery ticks", "✓ sent, ✓✓ delivered, 🔵✓✓ read"],
                        ].map(([icon, title, desc]) => (
                            <div key={title} className="bg-white/80 rounded-xl p-3 border border-zinc-100 shadow-sm">
                                <p className="text-base mb-1">{icon}</p>
                                <p className="text-xs font-bold text-zinc-700">{title}</p>
                                <p className="text-[10px] text-zinc-400 leading-snug">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
