"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Search, Send, CheckCheck, Check, Clock, Image as ImageIcon,
    Video, FileText, Music, Smile, Paperclip, MoreVertical,
    Phone, Archive, ChevronDown, MessageSquare, Loader2, X, RefreshCw
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
    direction: "inbound" | "outbound";
    type: string;
    body: string;
    mediaUrl?: string;
    templateName?: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function StatusIcon({ status }: { status: ChatMsg["status"] }) {
    if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
    if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />;
    if (status === "sent") return <Check className="w-3.5 h-3.5 text-zinc-400" />;
    if (status === "failed") return <X className="w-3.5 h-3.5 text-red-400" />;
    return <Clock className="w-3 h-3 text-zinc-300" />;
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatTab() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [convLoading, setConvLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [msgLoading, setMsgLoading] = useState(false);

    // Composer
    const [composeTab, setComposeTab] = useState<"text" | "template">("text");
    const [textInput, setTextInput] = useState("");
    const [sending, setSending] = useState(false);

    // Template composer
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const convPollingRef = useRef<NodeJS.Timeout | null>(null);

    // ── Fetch conversations ──────────────────────────────────────────────────
    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch("/api/whatsapp/conversations");
            const data = await res.json();
            if (data.success) setConversations(data.conversations);
        } finally {
            setConvLoading(false);
        }
    }, []);

    // ── Fetch messages for active conv ───────────────────────────────────────
    const fetchMessages = useCallback(async (convId: string, silent = false) => {
        if (!silent) setMsgLoading(true);
        try {
            const res = await fetch(`/api/whatsapp/conversations/${convId}/messages`);
            const data = await res.json();
            if (data.success) setMessages(data.messages);
        } finally {
            setMsgLoading(false);
        }
    }, []);

    // ── Fetch templates ──────────────────────────────────────────────────────
    useEffect(() => {
        fetch("/api/whatsapp/templates").then(r => r.json()).then(d => {
            if (d.success) setTemplates(d.templates);
        });
    }, []);

    // ── Initial load + conversation polling ───────────────────────────────────
    useEffect(() => {
        fetchConversations();
        convPollingRef.current = setInterval(fetchConversations, 5000);
        return () => { if (convPollingRef.current) clearInterval(convPollingRef.current); };
    }, [fetchConversations]);

    // ── Message polling when a conversation is open ───────────────────────────
    useEffect(() => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (!activeConv) return;

        fetchMessages(activeConv._id);
        pollingRef.current = setInterval(() => fetchMessages(activeConv._id, true), 3000);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [activeConv, fetchMessages]);

    // ── Auto-scroll to bottom ─────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── Open conversation ─────────────────────────────────────────────────────
    const openConversation = async (conv: Conversation) => {
        setActiveConv(conv);
        setMessages([]);
        setTextInput("");
        setSelectedTemplate("");
        setComposeTab("text");
        // Mark as read
        if (conv.unreadCount > 0) {
            await fetch(`/api/whatsapp/conversations/${conv._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markRead: true })
            });
            setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unreadCount: 0 } : c));
        }
    };

    // ── Send text ─────────────────────────────────────────────────────────────
    const handleSendText = async () => {
        if (!activeConv || !textInput.trim() || sending) return;
        setSending(true);
        const text = textInput.trim();
        setTextInput("");
        try {
            const res = await fetch(`/api/whatsapp/conversations/${activeConv._id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "text", text })
            });
            const data = await res.json();
            if (data.success) setMessages(prev => [...prev, data.message]);
        } finally { setSending(false); }
    };

    // ── Send template ─────────────────────────────────────────────────────────
    const handleSendTemplate = async () => {
        if (!activeConv || !selectedTemplate || sending) return;
        const tmpl = templates.find(t => t.name === selectedTemplate);
        if (!tmpl) return;

        // Build components from var values
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
        try {
            const res = await fetch(`/api/whatsapp/conversations/${activeConv._id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "template", templateName: selectedTemplate, templateLanguage: tmpl.language, templateComponents: components })
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => [...prev, data.message]);
                setSelectedTemplate("");
                setTemplateVarValues({});
            }
        } finally { setSending(false); }
    };

    const handleTemplateSelect = (name: string) => {
        setSelectedTemplate(name);
        const tmpl = templates.find(t => t.name === name);
        const vars = extractTemplateVars(tmpl);
        const init: Record<string, string> = {};
        vars.forEach(v => { init[v.id] = ""; });
        setTemplateVarValues(init);
    };

    const selectedTemplateObj = templates.find(t => t.name === selectedTemplate);
    const templateVars = extractTemplateVars(selectedTemplateObj);

    const filtered = conversations.filter(c =>
        c.contactName.toLowerCase().includes(search.toLowerCase()) ||
        c.contactPhone.includes(search)
    );

    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return (
        <div className="flex h-[calc(100vh-120px)] min-h-[600px] bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

            {/* ── LEFT PANEL: Conversation List ──────────────────────────── */}
            <div className={`flex flex-col border-r border-zinc-100 bg-white ${activeConv ? "hidden md:flex w-[340px] flex-shrink-0" : "flex flex-1 md:w-[340px] md:flex-shrink-0 md:flex-none"}`}>
                {/* Header */}
                <div className="px-4 py-4 bg-[#f0f2f5] flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">WA</div>
                        <div>
                            <h2 className="text-sm font-bold text-zinc-900">WhatsApp Inbox</h2>
                            {totalUnread > 0 && <p className="text-xs text-zinc-500">{totalUnread} unread</p>}
                        </div>
                    </div>
                    <button onClick={fetchConversations} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                        <RefreshCw className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-3 py-2 bg-[#f0f2f5] flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search or start new chat"
                            className="w-full bg-white rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                    {convLoading ? (
                        <div className="flex items-center justify-center h-32 text-zinc-400 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Loading chats…</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                            <MessageSquare className="w-10 h-10 text-zinc-200 mb-3" />
                            <p className="text-sm font-medium text-zinc-400">No conversations yet</p>
                            <p className="text-xs text-zinc-300 mt-1">Messages will appear here when customers contact you</p>
                        </div>
                    ) : (
                        filtered.map(conv => (
                            <button
                                key={conv._id}
                                onClick={() => openConversation(conv)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors border-b border-zinc-50 text-left ${activeConv?._id === conv._id ? "bg-zinc-100" : ""}`}
                            >
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm flex-shrink-0 relative overflow-hidden">
                                    {conv.contactProfilePic ? (
                                        <img src={conv.contactProfilePic} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{initials(conv.contactName || conv.contactPhone)}</span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-sm font-semibold text-zinc-900 truncate">
                                            {conv.contactName || `+${conv.contactPhone}`}
                                        </span>
                                        <span className="text-[11px] text-zinc-400 flex-shrink-0 ml-2">
                                            {formatTime(conv.lastMessageAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-zinc-500 truncate">{conv.lastMessage || "No messages yet"}</p>
                                        {conv.unreadCount > 0 && (
                                            <span className="ml-2 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL: Chat Thread ───────────────────────────────── */}
            {activeConv ? (
                <div className="flex flex-col flex-1 min-w-0">
                    {/* Chat Header */}
                    <div className="px-4 py-3 bg-[#f0f2f5] flex items-center gap-3 border-b border-zinc-200 flex-shrink-0">
                        <button
                            onClick={() => setActiveConv(null)}
                            className="md:hidden p-1 hover:bg-zinc-200 rounded-full transition-colors mr-1"
                        >
                            <ChevronDown className="w-5 h-5 text-zinc-600 rotate-90" />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm flex-shrink-0">
                            {initials(activeConv.contactName || activeConv.contactPhone)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-900 truncate">
                                {activeConv.contactName || `+${activeConv.contactPhone}`}
                            </p>
                            <p className="text-xs text-zinc-500">+{activeConv.contactPhone}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    fetch(`/api/whatsapp/conversations/${activeConv._id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ status: "archived" })
                                    });
                                    setConversations(prev => prev.filter(c => c._id !== activeConv._id));
                                    setActiveConv(null);
                                }}
                                className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                                title="Archive"
                            >
                                <Archive className="w-4 h-4 text-zinc-500" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
                        style={{
                            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e8f5e9' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                            backgroundColor: "#efeae2"
                        }}
                    >
                        {msgLoading ? (
                            <div className="flex justify-center pt-8">
                                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="bg-white/80 backdrop-blur rounded-2xl px-6 py-5 shadow-sm">
                                    <p className="text-sm text-zinc-500">No messages yet</p>
                                    <p className="text-xs text-zinc-400 mt-1">Send a template or text message below</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, idx) => {
                                    const isOut = msg.direction === "outbound";
                                    const showDate = idx === 0 ||
                                        new Date(msg.timestamp).toDateString() !== new Date(messages[idx - 1].timestamp).toDateString();

                                    return (
                                        <div key={msg._id}>
                                            {showDate && (
                                                <div className="flex justify-center my-3">
                                                    <span className="bg-white/80 text-zinc-500 text-[11px] px-3 py-1 rounded-full shadow-sm">
                                                        {new Date(msg.timestamp).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex ${isOut ? "justify-end" : "justify-start"} mb-0.5`}>
                                                <div className={`relative max-w-[70%] md:max-w-[60%] px-3 py-2 rounded-2xl shadow-sm ${isOut
                                                        ? "bg-[#d9fdd3] rounded-tr-sm text-zinc-900"
                                                        : "bg-white rounded-tl-sm text-zinc-900"
                                                    }`}>
                                                    {/* Template badge */}
                                                    {msg.type === "template" && msg.templateName && (
                                                        <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            Template: {msg.templateName}
                                                        </div>
                                                    )}
                                                    {/* Media icon */}
                                                    {["image", "video", "audio", "document"].includes(msg.type) && (
                                                        <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-2 mb-1">
                                                            <MsgTypeIcon type={msg.type} />
                                                            <span className="text-xs text-zinc-600 capitalize">{msg.type}</span>
                                                        </div>
                                                    )}
                                                    {/* Body */}
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                                                    {/* Time + Status */}
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

                    {/* ── Composer ─────────────────────────────────────────── */}
                    <div className="bg-[#f0f2f5] border-t border-zinc-200 flex-shrink-0">
                        {/* Tab Toggle */}
                        <div className="flex items-center gap-1 px-4 pt-3 pb-1">
                            <button
                                onClick={() => setComposeTab("text")}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${composeTab === "text" ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200"}`}
                            >
                                Text Message
                            </button>
                            <button
                                onClick={() => setComposeTab("template")}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${composeTab === "template" ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200"}`}
                            >
                                Template
                            </button>
                        </div>

                        {/* Text Composer */}
                        {composeTab === "text" && (
                            <div className="flex items-end gap-2 px-4 pb-4 pt-2">
                                <div className="flex-1 bg-white rounded-2xl px-4 py-2.5 shadow-sm">
                                    <textarea
                                        value={textInput}
                                        onChange={e => setTextInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                                        placeholder="Type a message"
                                        rows={1}
                                        className="w-full text-sm text-zinc-800 resize-none focus:outline-none max-h-32 overflow-y-auto bg-transparent"
                                        style={{ minHeight: "24px" }}
                                    />
                                </div>
                                <button
                                    onClick={handleSendText}
                                    disabled={!textInput.trim() || sending}
                                    className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 flex items-center justify-center transition-colors shadow-sm flex-shrink-0"
                                >
                                    {sending ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
                                </button>
                            </div>
                        )}

                        {/* Template Composer */}
                        {composeTab === "template" && (
                            <div className="px-4 pb-4 pt-2 space-y-3">
                                {/* Template Select */}
                                <select
                                    value={selectedTemplate}
                                    onChange={e => handleTemplateSelect(e.target.value)}
                                    className="w-full bg-white border-0 rounded-xl px-4 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-400 shadow-sm"
                                >
                                    <option value="">Select a template…</option>
                                    {templates.map(t => (
                                        <option key={t.name} value={t.name}>{t.name} ({t.language})</option>
                                    ))}
                                </select>

                                {/* Template Preview + Variable Inputs */}
                                {selectedTemplate && selectedTemplateObj && (
                                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                        {/* Preview with actual template text */}
                                        <div className="px-4 py-3 border-b border-zinc-100 bg-emerald-50">
                                            {selectedTemplateObj.components.map((comp, i) => (
                                                <div key={i} className="text-xs text-zinc-700 mb-1">
                                                    {comp.format && comp.format !== "TEXT" ? (
                                                        <span className="text-zinc-400 italic">[{comp.format}]</span>
                                                    ) : (
                                                        <span className={comp.type === "HEADER" ? "font-bold" : ""}>{comp.text}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {/* Variable inputs */}
                                        {templateVars.length > 0 && (
                                            <div className="px-4 py-3 space-y-2">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Fill Variables</p>
                                                {templateVars.map(v => (
                                                    <div key={v.id} className="flex items-center gap-3">
                                                        <span className="text-xs text-zinc-500 w-24 flex-shrink-0">{v.label}:</span>
                                                        <input
                                                            type="text"
                                                            value={templateVarValues[v.id] || ""}
                                                            onChange={e => setTemplateVarValues(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                            placeholder={`Value for ${v.label}`}
                                                            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleSendTemplate}
                                    disabled={!selectedTemplate || sending}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {sending ? "Sending…" : "Send Template"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* ── Empty State (no active conv, desktop) ── */
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#f8f9fa] text-center px-8">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
                        <MessageSquare className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-800 mb-2">WhatsApp Inbox</h3>
                    <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
                        Select a conversation from the left to start chatting, or incoming messages will appear automatically when customers contact you.
                    </p>
                    <div className="mt-6 text-xs text-zinc-400 bg-white/70 backdrop-blur px-4 py-3 rounded-xl border border-zinc-100 shadow-sm max-w-sm">
                        💡 <strong>Tip:</strong> Polling updates every 3 seconds. Configure your Meta Webhook in App Dashboard → Webhooks to receive messages in real time.
                    </div>
                </div>
            )}
        </div>
    );
}
