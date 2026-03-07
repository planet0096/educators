"use client";
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { MessageCircle, Settings, Send, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Video, FileText, MapPin, ExternalLink, Phone, Copy, ListX, ArrowRight, Users, Tags, Megaphone, Store, MessageSquare } from "lucide-react";
import { WhatsAppTemplate, WhatsAppTemplateComponent } from "@/models/WhatsAppTemplateTypes";

import ContactsTab from "./components/ContactsTab";
import ListsTab from "./components/ListsTab";
import TagsTab from "./components/TagsTab";
import CampaignsTab from "./components/CampaignsTab";
import IntegrationsTab from "./components/IntegrationsTab";
import ChatTab from "./components/ChatTab";

export default function WhatsAppPage() {
    const [activeTab, setActiveTab] = useState<"settings" | "test" | "contacts" | "lists" | "tags" | "campaigns" | "integrations" | "chat">("chat");

    // Config state
    const [appId, setAppId] = useState("");
    const [phoneNumberId, setPhoneNumberId] = useState("");
    const [accessToken, setAccessToken] = useState("");
    const [wabaId, setWabaId] = useState("");
    const [configLoading, setConfigLoading] = useState(true);
    const [configSaving, setConfigSaving] = useState(false);
    const [configMessage, setConfigMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

    // Test message state
    const [recipientNumber, setRecipientNumber] = useState("");
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [selectedTemplateName, setSelectedTemplateName] = useState("");
    const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

    const [testSending, setTestSending] = useState(false);
    const [testResult, setTestResult] = useState<{ type: "success" | "error", text: string } | null>(null);

    const hasConfig = appId && phoneNumberId && accessToken && wabaId;

    useEffect(() => {
        fetchConfig();
    }, []);

    useEffect(() => {
        if (activeTab === "test" && hasConfig) {
            fetchTemplates();
        }
    }, [activeTab, hasConfig]);

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/whatsapp/config");
            const data = await res.json();
            if (data.success && data.config) {
                setAppId(data.config.appId || "");
                setPhoneNumberId(data.config.phoneNumberId || "");
                setAccessToken(data.config.accessToken || "");
                setWabaId(data.config.wabaId || "");
            }
        } catch (error) {
            console.error("Error fetching config", error);
        } finally {
            setConfigLoading(false);
        }
    };

    const fetchTemplates = async () => {
        setTemplatesLoading(true);
        try {
            const res = await fetch("/api/whatsapp/templates");
            const data = await res.json();
            if (data.success && data.templates) {
                setTemplates(data.templates);
                if (data.templates.length > 0) {
                    setSelectedTemplateName(data.templates[0].name);
                    initializeVariables(data.templates[0].name, data.templates);
                } else {
                    setSelectedTemplateName("");
                    setTemplateVariables({});
                }
            }
        } catch (error) {
            console.error("Error fetching templates", error);
        } finally {
            setTemplatesLoading(false);
        }
    };

    const getSelectedTemplate = (name: string, tmpls: WhatsAppTemplate[] = templates) => {
        return tmpls.find(t => t.name === name);
    };

    const initializeVariables = (templateName: string, tmpls: WhatsAppTemplate[] = templates) => {
        const template = getSelectedTemplate(templateName, tmpls);
        if (!template) {
            setTemplateVariables({});
            return;
        }

        const newVars: Record<string, string> = {};

        template.components.forEach(comp => {
            if (comp.type === "HEADER") {
                if (comp.format === "TEXT" && comp.text) {
                    const matches = comp.text.match(/\{\{(\d+)\}\}/g);
                    if (matches) {
                        matches.forEach(m => {
                            const varId = `HEADER_${m.replace(/[{}]/g, "")}`;
                            newVars[varId] = "";
                        });
                    }
                } else if (comp.format === "LOCATION") {
                    newVars[`HEADER_LOCATION_LAT`] = "";
                    newVars[`HEADER_LOCATION_LONG`] = "";
                    newVars[`HEADER_LOCATION_NAME`] = "";
                    newVars[`HEADER_LOCATION_ADDRESS`] = "";
                } else if (comp.format === "DOCUMENT") {
                    newVars[`HEADER_MEDIA_${comp.format}`] = "";
                    newVars[`HEADER_DOCUMENT_FILENAME`] = "Document.pdf"; // Default filename
                } else if (comp.format && comp.format !== "TEXT") {
                    newVars[`HEADER_MEDIA_${comp.format}`] = "";
                }
            }

            if (comp.type === "BODY" && comp.text) {
                const matches = comp.text.match(/\{\{(\d+)\}\}/g);
                if (matches) {
                    matches.forEach(m => {
                        const varId = `BODY_${m.replace(/[{}]/g, "")}`;
                        newVars[varId] = "";
                    });
                }
            }

            if (comp.type === "BUTTONS" && comp.buttons) {
                comp.buttons.forEach((btn: any, index: number) => {
                    if (btn.type === "URL" && btn.url && btn.url.includes("{{1}}")) {
                        newVars[`BUTTON_${index}_URL`] = "";
                    }
                    if (btn.type === "COPY_CODE" && btn.example && btn.example[0]) {
                        newVars[`BUTTON_${index}_CODE`] = "";
                    }
                    if (btn.type === "QUICK_REPLY") {
                        newVars[`BUTTON_${index}_PAYLOAD`] = `quick_reply_payload_${index}`;
                    }
                    if (btn.type === "FLOW") {
                        newVars[`BUTTON_${index}_FLOW_TOKEN`] = `flow_token_${index}`;
                    }
                });
            }
        });

        setTemplateVariables(newVars);
    };

    const handleTemplateChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const name = e.target.value;
        setSelectedTemplateName(name);
        initializeVariables(name);
    };

    const handleVariableChange = (varId: string, value: string) => {
        setTemplateVariables(prev => ({ ...prev, [varId]: value }));
    };

    // Construct Preview Data
    const getPreviewData = () => {
        const template = getSelectedTemplate(selectedTemplateName);
        if (!template) return null;

        let header: any = null;
        let bodyText = "";
        let footerText = "";
        let buttons: any[] = [];

        template.components.forEach(comp => {
            if (comp.type === "HEADER") {
                if (comp.format === "TEXT" && comp.text) {
                    let text = comp.text;
                    Object.keys(templateVariables).forEach(key => {
                        if (key.startsWith("HEADER_")) {
                            const num = key.replace("HEADER_", "");
                            text = text.replace(`{{${num}}}`, templateVariables[key] || `{{${num}}}`);
                        }
                    });
                    header = { type: "TEXT", text };
                } else if (comp.format === "LOCATION") {
                    header = {
                        type: "LOCATION",
                        name: templateVariables[`HEADER_LOCATION_NAME`],
                        address: templateVariables[`HEADER_LOCATION_ADDRESS`]
                    };
                } else if (comp.format) {
                    header = { type: comp.format, url: templateVariables[`HEADER_MEDIA_${comp.format}`] };
                }
            } else if (comp.type === "BODY" && comp.text) {
                let text = comp.text;
                Object.keys(templateVariables).forEach(key => {
                    if (key.startsWith("BODY_")) {
                        const num = key.replace("BODY_", "");
                        text = text.replace(`{{${num}}}`, templateVariables[key] || `{{${num}}}`);
                    }
                });
                bodyText = text;
            } else if (comp.type === "FOOTER" && comp.text) {
                footerText = comp.text;
            } else if (comp.type === "BUTTONS" && comp.buttons) {
                buttons = comp.buttons.map((btn, index) => {
                    if (btn.type === "URL" && btn.url && btn.url.includes("{{1}}")) {
                        const varId = `BUTTON_${index}_URL`;
                        const dynamicUrl = btn.url.replace("{{1}}", templateVariables[varId] || "{{1}}");
                        return { ...btn, displayUrl: dynamicUrl };
                    }
                    return btn;
                });
            }
        });

        return { header, bodyText, footerText, buttons };
    };

    const handleSaveConfig = async (e: FormEvent) => {
        e.preventDefault();
        setConfigSaving(true);
        setConfigMessage(null);

        try {
            const res = await fetch("/api/whatsapp/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appId, phoneNumberId, accessToken, wabaId })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setConfigMessage({ type: "success", text: "Configuration saved successfully!" });
            } else {
                setConfigMessage({ type: "error", text: data.error || "Failed to save configuration." });
            }
        } catch (error) {
            setConfigMessage({ type: "error", text: "An error occurred while saving." });
        } finally {
            setConfigSaving(false);
        }
    };

    const buildComponentsPayload = () => {
        const template = getSelectedTemplate(selectedTemplateName);
        if (!template) return [];

        const components: any[] = [];

        template.components.forEach(comp => {
            if (comp.type === "HEADER") {
                if (comp.format === "TEXT" && comp.text) {
                    const matches = comp.text.match(/\{\{(\d+)\}\}/g);
                    if (matches) {
                        const parameters = matches.map(m => {
                            const num = m.replace(/[{}]/g, "");
                            return { type: "text", text: templateVariables[`HEADER_${num}`] || "" };
                        });
                        if (parameters.length > 0) {
                            components.push({ type: "header", parameters });
                        }
                    }
                } else if (comp.format === "LOCATION") {
                    const lat = templateVariables[`HEADER_LOCATION_LAT`];
                    const long = templateVariables[`HEADER_LOCATION_LONG`];
                    const name = templateVariables[`HEADER_LOCATION_NAME`];
                    const address = templateVariables[`HEADER_LOCATION_ADDRESS`];

                    if (lat && long) {
                        components.push({
                            type: "header",
                            parameters: [
                                {
                                    type: "location",
                                    location: {
                                        latitude: lat.toString(),
                                        longitude: long.toString(),
                                        name: name ? name.toString() : "Location",
                                        address: address ? address.toString() : "Address"
                                    }
                                }
                            ]
                        });
                    }
                } else if (comp.format && comp.format !== "TEXT") {
                    const mediaUrl = templateVariables[`HEADER_MEDIA_${comp.format}`];

                    if (mediaUrl) {
                        const mediaType = comp.format.toLowerCase(); // image, document, video

                        let mediaPayload: any = { link: mediaUrl };

                        // Documents require a filename in many cases, especially if they don't have an extension in the URL
                        if (mediaType === "document") {
                            mediaPayload.filename = templateVariables[`HEADER_DOCUMENT_FILENAME`] || "Document.pdf";
                        }

                        components.push({
                            type: "header",
                            parameters: [
                                {
                                    type: mediaType,
                                    [mediaType]: mediaPayload
                                }
                            ]
                        });
                    }
                }
            } else if (comp.type === "BODY" && comp.text) {
                const matches = comp.text.match(/\{\{(\d+)\}\}/g);
                if (matches) {
                    const parameters = matches.map(m => {
                        const num = m.replace(/[{}]/g, "");
                        return { type: "text", text: templateVariables[`BODY_${num}`] || "" };
                    });
                    if (parameters.length > 0) {
                        components.push({ type: "body", parameters });
                    }
                }
            } else if (comp.type === "BUTTONS" && comp.buttons) {
                comp.buttons.forEach((btn: any, index: number) => {
                    if (btn.type === "URL" && btn.url && btn.url.includes("{{1}}")) {
                        const varId = `BUTTON_${index}_URL`;
                        if (templateVariables[varId]) {
                            components.push({
                                type: "button",
                                sub_type: "url",
                                index: index.toString(),
                                parameters: [
                                    { type: "text", text: templateVariables[varId] }
                                ]
                            });
                        }
                    } else if (btn.type === "COPY_CODE" && btn.example && btn.example[0]) {
                        const varId = `BUTTON_${index}_CODE`;
                        if (templateVariables[varId]) {
                            components.push({
                                type: "button",
                                sub_type: "copy_code",
                                index: index.toString(),
                                parameters: [
                                    { type: "coupon_code", coupon_code: templateVariables[varId] }
                                ]
                            });
                        }
                    } else if (btn.type === "QUICK_REPLY") {
                        const varId = `BUTTON_${index}_PAYLOAD`;
                        if (templateVariables[varId]) {
                            components.push({
                                type: "button",
                                sub_type: "quick_reply",
                                index: index.toString(),
                                parameters: [
                                    { type: "payload", payload: templateVariables[varId] }
                                ]
                            });
                        }
                    } else if (btn.type === "FLOW") {
                        const varId = `BUTTON_${index}_FLOW_TOKEN`;
                        if (templateVariables[varId]) {
                            components.push({
                                type: "button",
                                sub_type: "flow",
                                index: index.toString(),
                                parameters: [
                                    {
                                        type: "action",
                                        action: {
                                            flow_token: templateVariables[varId],
                                            flow_action_data: {}
                                        }
                                    }
                                ]
                            });
                        }
                    }
                });
            }
        });

        return components;
    };

    const handleSendTest = async (e: FormEvent) => {
        e.preventDefault();
        setTestSending(true);
        setTestResult(null);

        const template = getSelectedTemplate(selectedTemplateName);
        const language = template ? template.language : "en_US";
        const components = buildComponentsPayload();

        try {
            const res = await fetch("/api/whatsapp/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipientNumber,
                    templateName: selectedTemplateName,
                    templateLanguage: language,
                    components
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setTestResult({ type: "success", text: "Message sent successfully!" });
                setRecipientNumber("");
            } else {
                setTestResult({ type: "error", text: data.error || "Failed to send message." });
            }
        } catch (error) {
            setTestResult({ type: "error", text: "An error occurred while sending." });
        } finally {
            setTestSending(false);
        }
    };

    if (configLoading) {
        return (
            <div className="flex items-center justify-center p-12 min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    const previewData = getPreviewData();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-200">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
                        <MessageCircle className="w-8 h-8 text-emerald-600" />
                        WhatsApp CRM Integration
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Connect your WhatsApp Cloud API to communicate with students directly from the platform.
                    </p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-zinc-200">
                <button
                    onClick={() => setActiveTab("settings")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "settings"
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                        } `}
                >
                    <Settings className="w-4 h-4" />
                    Configuration
                </button>
                <button
                    onClick={() => setActiveTab("test")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "test"
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                        } `}
                >
                    <Send className="w-4 h-4" />
                    Test Message
                </button>
                <div className="w-px h-6 bg-zinc-200 self-center mx-2 hidden md:block"></div>
                <button
                    onClick={() => setActiveTab("campaigns")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "campaigns"
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                        } `}
                >
                    <Megaphone className="w-4 h-4" />
                    Campaigns
                </button>
                <button
                    onClick={() => setActiveTab("contacts")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "contacts"
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                        } `}
                >
                    <Users className="w-4 h-4" />
                    Contacts
                </button>
                <button
                    onClick={() => setActiveTab("lists")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "lists"
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                        } `}
                >
                    <ListX className="w-4 h-4" />
                    Lists
                </button>
                <button
                    onClick={() => setActiveTab("tags")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "tags"
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                        } `}
                >
                    <Tags className="w-4 h-4" />
                    Tags
                </button>
                <div className="w-px h-6 bg-zinc-200 self-center mx-2 hidden md:block"></div>
                <button
                    onClick={() => setActiveTab("integrations")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "integrations"
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                        } `}
                >
                    <Store className="w-4 h-4" />
                    Integrations
                </button>
                <div className="w-px h-6 bg-zinc-200 self-center mx-2 hidden md:block"></div>
                <button
                    onClick={() => setActiveTab("chat")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "chat"
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                        } `}
                >
                    <MessageSquare className="w-4 h-4" />
                    Inbox
                </button>
            </div>

            {/* Content Area */}
            <div className="mt-6">
                {activeTab === "settings" && (
                    <div className="max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 md:p-8 space-y-8">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900">Cloud API Credentials</h3>
                                <p className="text-zinc-500 text-sm mt-1">
                                    Enter your Meta App and WhatsApp configuration details. You can find these in your Meta App Dashboard under WhatsApp &gt; API Setup.
                                </p>
                            </div>

                            <form onSubmit={handleSaveConfig} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-900 block">App ID</label>
                                    <input
                                        type="text"
                                        required
                                        value={appId}
                                        onChange={(e) => setAppId(e.target.value)}
                                        placeholder="e.g. 104598283928192"
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-900 block">WhatsApp Business Account ID (WABA ID)</label>
                                    <input
                                        type="text"
                                        required
                                        value={wabaId}
                                        onChange={(e) => setWabaId(e.target.value)}
                                        placeholder="e.g. 106294829103948"
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-900 block">Phone Number ID</label>
                                    <input
                                        type="text"
                                        required
                                        value={phoneNumberId}
                                        onChange={(e) => setPhoneNumberId(e.target.value)}
                                        placeholder="e.g. 105837261928374"
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-900 block">Permanent Access Token</label>
                                    <textarea
                                        required
                                        value={accessToken}
                                        onChange={(e) => setAccessToken(e.target.value)}
                                        placeholder="EAAOXZA..."
                                        rows={4}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm resize-none"
                                    />
                                </div>

                                {configMessage && (
                                    <div className={`flex items-center gap-2 p-3 text-sm rounded-xl font-medium ${configMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                        : "bg-red-50 text-red-700 border border-red-200/60"
                                        } `}>
                                        {configMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {configMessage.text}
                                    </div>
                                )}

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={configSaving}
                                        className="bg-zinc-900 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                                    >
                                        {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Save Configuration
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === "test" && (
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 md:p-8">
                            {!hasConfig ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Settings className="w-8 h-8 text-zinc-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">Configuration Required</h3>
                                    <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
                                        You need to save your WhatsApp Cloud API credentials in the Settings tab before sending test messages.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab("settings")}
                                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium px-4 py-2 rounded-xl text-sm transition-colors"
                                    >
                                        Go to Settings
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    {/* Form Column */}
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-lg font-semibold text-zinc-900">Send Test Message</h3>
                                            <p className="text-zinc-500 text-sm mt-1">
                                                Test your API connection by sending a template message to any WhatsApp number.
                                            </p>
                                        </div>

                                        {templatesLoading ? (
                                            <div className="flex items-center gap-3 text-zinc-500 py-8">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span className="text-sm font-medium">Fetching approved templates...</span>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleSendTest} className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-zinc-900 block">Recipient Number</label>
                                                    <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                                                        <span className="flex items-center justify-center px-4 bg-zinc-100 border-r border-zinc-200 text-zinc-500 font-medium text-sm">
                                                            +
                                                        </span>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={recipientNumber}
                                                            onChange={(e) => setRecipientNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                                            placeholder="1234567890"
                                                            className="w-full bg-transparent px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-zinc-500 mt-1">Include country code without + sign.</p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-zinc-900 block">Template Name</label>
                                                    <select
                                                        value={selectedTemplateName}
                                                        onChange={handleTemplateChange}
                                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                                    >
                                                        {templates.length === 0 && <option value="">No approved templates found</option>}
                                                        {templates.map(t => (
                                                            <option key={t.name} value={t.name}>{t.name} ({t.language})</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Dynamic Variables Inputs */}
                                                {Object.keys(templateVariables).length > 0 && (
                                                    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-4">
                                                        <h4 className="text-sm font-semibold text-zinc-900">Template Variables</h4>
                                                        {Object.keys(templateVariables).map(varId => (
                                                            <div key={varId} className="space-y-1.5">
                                                                <label className="text-xs font-medium text-zinc-700 block">
                                                                    {varId.replace('_', ' ')}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    value={templateVariables[varId]}
                                                                    onChange={(e) => handleVariableChange(varId, e.target.value)}
                                                                    placeholder={`Enter value for ${varId}`}
                                                                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {testResult && (
                                                    <div className={`flex items-center gap-2 p-3 text-sm rounded-xl font-medium ${testResult.type === "success"
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                                        : "bg-red-50 text-red-700 border border-red-200/60"
                                                        } `}>
                                                        {testResult.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                                        <span className="flex-1">{testResult.text}</span>
                                                    </div>
                                                )}

                                                <div className="pt-4 border-t border-zinc-100 flex justify-end">
                                                    <button
                                                        type="submit"
                                                        disabled={testSending || !recipientNumber || templates.length === 0 || !selectedTemplateName || Object.values(templateVariables).some(v => v === "")}
                                                        className="bg-emerald-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2 w-full justify-center lg:w-auto"
                                                    >
                                                        {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                        Send Message
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>

                                    {/* Live Preview Column */}
                                    <div className="hidden lg:block">
                                        <div className="sticky top-24">
                                            <h3 className="text-lg font-semibold text-zinc-900 mb-6">Live Preview</h3>

                                            {/* WhatsApp Chat Bubble Replica */}
                                            <div className="bg-[#EFEAE2] p-6 rounded-2xl shadow-inner min-h-[400px] flex flex-col justify-end bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/QRrocmmUIfL.png')] bg-repeat bg-[length:400px_auto] opacity-90 relative overflow-hidden">

                                                {previewData ? (
                                                    <div className="flex flex-col items-end w-full space-y-1">
                                                        <div className="bg-white p-2 rounded-xl shadow-sm text-sm text-[#111B21] max-w-[85%] relative before:content-[''] before:absolute before:bottom-0 before:-right-3 before:border-[16px] before:border-transparent before:border-b-white before:border-l-white z-10">

                                                            {/* Header */}
                                                            {previewData.header && (
                                                                <div className="mb-2">
                                                                    {previewData.header.type === "TEXT" && (
                                                                        <div className="font-bold px-1 pt-1 whitespace-pre-wrap">{previewData.header.text}</div>
                                                                    )}
                                                                    {previewData.header.type === "IMAGE" && (
                                                                        <div className="w-full h-32 bg-zinc-100 rounded-lg flex items-center justify-center overflow-hidden">
                                                                            {previewData.header.url ? (
                                                                                <img src={previewData.header.url} alt="Header" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                                            ) : (
                                                                                <ImageIcon className="w-8 h-8 text-zinc-300" />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {previewData.header.type === "VIDEO" && (
                                                                        <div className="w-full h-32 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden relative">
                                                                            <Video className="w-8 h-8 text-zinc-500" />
                                                                        </div>
                                                                    )}
                                                                    {previewData.header.type === "DOCUMENT" && (
                                                                        <div className="w-full bg-zinc-100 p-3 rounded-lg flex items-center gap-3">
                                                                            <FileText className="w-6 h-6 text-red-500 shrink-0" />
                                                                            <span className="text-zinc-600 font-medium truncate text-xs">
                                                                                {templateVariables[`HEADER_DOCUMENT_FILENAME`] || "Document"}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {previewData.header.type === "LOCATION" && (
                                                                        <div className="w-full h-32 bg-emerald-50 rounded-lg flex flex-col items-center justify-center border border-emerald-100 p-2 text-center">
                                                                            <MapPin className="w-6 h-6 text-emerald-600 mb-1" />
                                                                            {previewData.header.name && <span className="font-semibold text-emerald-800 text-xs truncate w-full">{previewData.header.name}</span>}
                                                                            {previewData.header.address && <span className="text-emerald-600 text-[10px] truncate w-full">{previewData.header.address}</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Body */}
                                                            {previewData.bodyText && (
                                                                <div className="whitespace-pre-wrap px-1">{previewData.bodyText}</div>
                                                            )}

                                                            {/* Footer */}
                                                            {previewData.footerText && (
                                                                <div className="text-[11px] text-[#667781] mt-1.5 uppercase whitespace-pre-wrap px-1">{previewData.footerText}</div>
                                                            )}
                                                            <div className="text-[10px] text-[#667781] text-right mt-1 px-1">10:42 AM <span className="text-[#53BDEB] inline-block ml-0.5">✓✓</span></div>
                                                        </div>

                                                        {/* Buttons */}
                                                        {previewData.buttons && previewData.buttons.length > 0 && (
                                                            <div className="flex flex-col w-full max-w-[85%] space-y-1">
                                                                {previewData.buttons.map((btn, idx) => (
                                                                    <div key={idx} className="bg-white rounded-xl shadow-sm text-[#00A884] text-sm font-medium py-2.5 px-4 text-center cursor-pointer hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2">
                                                                        {btn.type === "URL" && <ExternalLink className="w-4 h-4" />}
                                                                        {btn.type === "PHONE_NUMBER" && <Phone className="w-4 h-4" />}
                                                                        {btn.type === "COPY_CODE" && <Copy className="w-4 h-4" />}
                                                                        {btn.type === "QUICK_REPLY" && <ArrowRight className="w-4 h-4" />}
                                                                        {btn.type === "CATALOG" && <ListX className="w-4 h-4" />}
                                                                        {btn.text}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl text-center text-zinc-500 text-sm font-medium self-center w-full max-w-[80%] shadow-sm">
                                                        Select a template on the left to view the preview.
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "campaigns" && <CampaignsTab />}
                {activeTab === "contacts" && <ContactsTab />}
                {activeTab === "lists" && <ListsTab />}
                {activeTab === "tags" && <TagsTab />}
                {activeTab === "integrations" && <IntegrationsTab />}
                {activeTab === "chat" && <ChatTab />}
            </div>
        </div>
    );
}
