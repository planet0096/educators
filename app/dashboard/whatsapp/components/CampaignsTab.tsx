import { useState, useEffect, FormEvent } from "react";
import { Megaphone, Plus, Loader2, Play, CheckCircle2, AlertCircle, Users, ChevronLeft, RefreshCw, XCircle, Image as ImageIcon, Video, FileText, MapPin, ExternalLink, Phone, Copy, ListX, ArrowRight } from "lucide-react";
import { WhatsAppTemplate } from "@/models/WhatsAppTemplateTypes";

interface Campaign {
    _id: string;
    name: string;
    templateName: string;
    status: "pending" | "running" | "completed" | "failed";
    totalContacts: number;
    successfulSends: number;
    failedSends: number;
    createdAt: string;
}

interface AudienceMetadata {
    lists: { _id: string, name: string }[];
    tags: { _id: string, name: string, color: string }[];
}

export default function CampaignsTab() {
    const [view, setView] = useState<"list" | "create" | "detail">("list");
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Wizard State
    const [newName, setNewName] = useState("");
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [selectedTemplateName, setSelectedTemplateName] = useState("");
    const [audienceData, setAudienceData] = useState<AudienceMetadata>({ lists: [], tags: [] });
    const [selectedLists, setSelectedLists] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [audienceCount, setAudienceCount] = useState<number | null>(null);
    const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Detail View State
    const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
    const [campaignMessages, setCampaignMessages] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isPolling, setIsPolling] = useState(false);

    useEffect(() => {
        if (view === "list") {
            fetchCampaigns();
        } else if (view === "create") {
            fetchMetadataForWizard();
        }
    }, [view]);

    useEffect(() => {
        if (view === "create") {
            fetchAudienceCount();
        }
    }, [selectedLists, selectedTags, view]);

    // Live poller for detail view — only polls for UI status updates, NOT for triggering sends
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (view === "detail" && activeCampaign && (activeCampaign.status === "pending" || activeCampaign.status === "running")) {
            setIsPolling(true);
            interval = setInterval(() => {
                fetchCampaignDetail(activeCampaign._id, true);
            }, 3000); // Poll every 3 seconds while running
        } else {
            setIsPolling(false);
        }
        return () => clearInterval(interval);
    }, [view, activeCampaign]);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/whatsapp/campaigns");
            const data = await res.json();
            if (data.campaigns) setCampaigns(data.campaigns);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadataForWizard = async () => {
        try {
            const [listsRes, tagsRes, templatesRes] = await Promise.all([
                fetch("/api/whatsapp/lists"),
                fetch("/api/whatsapp/tags"),
                fetch("/api/whatsapp/templates")
            ]);

            const lists = await listsRes.json();
            const tags = await tagsRes.json();
            const tmpls = await templatesRes.json();

            setAudienceData({
                lists: lists.lists || [],
                tags: tags.tags || []
            });

            if (tmpls.templates) {
                setTemplates(tmpls.templates);
                if (tmpls.templates.length > 0) setSelectedTemplateName(tmpls.templates[0].name);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAudienceCount = async () => {
        if (selectedLists.length === 0 && selectedTags.length === 0) {
            setAudienceCount(0);
            return;
        }
        try {
            const res = await fetch("/api/whatsapp/contacts/count", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetLists: selectedLists, targetTags: selectedTags })
            });
            const data = await res.json();
            if (res.ok) {
                setAudienceCount(data.count);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getSelectedTemplate = (name: string) => {
        return templates.find(t => t.name === name);
    };

    const initializeVariables = (name: string) => {
        const template = getSelectedTemplate(name);
        if (!template) {
            setTemplateVariables({});
            return;
        }

        const initialVars: Record<string, string> = {};

        template.components.forEach(comp => {
            if (comp.type === "HEADER") {
                if (comp.format === "TEXT" && comp.text) {
                    const matches = comp.text.match(/\{\{(\d+)\}\}/g);
                    if (matches) {
                        matches.forEach(m => {
                            const num = m.replace(/[{}]/g, "");
                            initialVars[`HEADER_${num}`] = "";
                        });
                    }
                } else if (comp.format === "LOCATION") {
                    initialVars[`HEADER_LOCATION_LAT`] = "";
                    initialVars[`HEADER_LOCATION_LONG`] = "";
                    initialVars[`HEADER_LOCATION_NAME`] = "";
                    initialVars[`HEADER_LOCATION_ADDRESS`] = "";
                } else if (comp.format && comp.format !== "TEXT") {
                    initialVars[`HEADER_MEDIA_${comp.format}`] = "";
                    if (comp.format.toLowerCase() === "document") {
                        initialVars[`HEADER_DOCUMENT_FILENAME`] = "";
                    }
                }
            } else if (comp.type === "BODY" && comp.text) {
                const matches = comp.text.match(/\{\{(\d+)\}\}/g);
                if (matches) {
                    matches.forEach(m => {
                        const num = m.replace(/[{}]/g, "");
                        initialVars[`BODY_${num}`] = "";
                    });
                }
            } else if (comp.type === "BUTTONS" && comp.buttons) {
                comp.buttons.forEach((btn, index) => {
                    if (btn.type === "URL" && btn.url && btn.url.includes("{{1}}")) {
                        initialVars[`BUTTON_${index}_URL`] = "";
                    } else if (btn.type === "COPY_CODE" && btn.example && btn.example[0]) {
                        initialVars[`BUTTON_${index}_CODE`] = "";
                    } else if (btn.type === "QUICK_REPLY") {
                        initialVars[`BUTTON_${index}_PAYLOAD`] = "";
                    } else if (btn.type === "FLOW") {
                        initialVars[`BUTTON_${index}_FLOW_TOKEN`] = "";
                    }
                });
            }
        });

        setTemplateVariables(initialVars);
    };

    const handleVariableChange = (varId: string, value: string) => {
        setTemplateVariables(prev => ({ ...prev, [varId]: value }));
    };

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

    const fetchCampaignDetail = async (id: string, silent = false) => {
        if (!silent) setDetailLoading(true);
        try {
            const [campaignRes, messagesRes] = await Promise.all([
                fetch(`/api/whatsapp/campaigns/${id}`),
                fetch(`/api/whatsapp/campaigns/${id}/messages?limit=50`)
            ]);

            const campaignData = await campaignRes.json();
            const messagesData = await messagesRes.json();

            if (campaignData.campaign) setActiveCampaign(campaignData.campaign);
            if (messagesData.messages) setCampaignMessages(messagesData.messages);
        } catch (err) {
            console.error(err);
        } finally {
            if (!silent) setDetailLoading(false);
        }
    };

    const handleCreateCampaign = async (e: FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        setCreating(true);

        const template = templates.find(t => t.name === selectedTemplateName);

        try {
            const res = await fetch("/api/whatsapp/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    templateName: selectedTemplateName,
                    templateLanguage: template ? template.language : "en_US",
                    targetLists: selectedLists,
                    targetTags: selectedTags,
                    baseComponents: buildBaseComponentsPayload(template)
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                // Navigate to detail page - QStash is already processing in the background
                setActiveCampaign(data.campaign);
                setView("detail");
            } else {
                setCreateError(data.error || "Failed to create campaign");
            }
        } catch (err) {
            setCreateError("An error occurred");
        } finally {
            setCreating(false);
        }
    };

    const buildBaseComponentsPayload = (template?: WhatsAppTemplate) => {
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
                        const mediaType = comp.format.toLowerCase();
                        let mediaPayload: any = { link: mediaUrl };

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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "running": return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Running</span>;
            case "completed": return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
            case "failed": return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Error</span>;
            default: return <span className="bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Pending</span>;
        }
    };

    // --- Views ---

    if (view === "create") {
        const previewData = getPreviewData();

        return (
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView("list")} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold text-zinc-900">Create New Campaign</h2>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Form Column */}
                        <div>
                            <form onSubmit={handleCreateCampaign} className="space-y-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-zinc-900 block mb-1.5">Campaign Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            placeholder="e.g. Welcome Series - August"
                                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-zinc-900 block mb-1.5">Message Template</label>
                                        <select
                                            required
                                            value={selectedTemplateName}
                                            onChange={e => {
                                                setSelectedTemplateName(e.target.value);
                                                initializeVariables(e.target.value);
                                            }}
                                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
                                        >
                                            {templates.length === 0 ? <option value="">No templates found</option> :
                                                templates.map((t, i) => <option key={`${t.name}-${i}`} value={t.name}>{t.name} ({t.language})</option>)
                                            }
                                        </select>
                                    </div>

                                    {/* Dynamic Variables Inputs */}
                                    {Object.keys(templateVariables).length > 0 && (
                                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-4">
                                            <h4 className="text-sm font-semibold text-zinc-900">Template Variables</h4>
                                            {Object.keys(templateVariables).map(varId => (
                                                <div key={varId} className="space-y-1.5">
                                                    <label className="text-xs font-medium text-zinc-700 block">
                                                        {varId.replace(/_/g, ' ')}
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
                                </div>

                                <div className="pt-6 border-t border-zinc-100">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-emerald-600" />
                                            Target Audience
                                        </h3>
                                        {audienceCount !== null && (
                                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                                                {audienceCount} {audienceCount === 1 ? 'Contact' : 'Contacts'} Matched
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 mb-4">Select the lists or tags of contacts you want to send this broadcast to. Contacts matching ANY selection will be included.</p>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-3 block">Target Lists</label>
                                            <div className="flex flex-wrap gap-2">
                                                {audienceData.lists.length === 0 ? <span className="text-sm text-zinc-400 italic">No lists</span> : audienceData.lists.map(list => (
                                                    <button
                                                        type="button"
                                                        key={list._id}
                                                        onClick={() => setSelectedLists(p => p.includes(list._id) ? p.filter(id => id !== list._id) : [...p, list._id])}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedLists.includes(list._id)
                                                            ? "bg-zinc-900 text-white border-zinc-900"
                                                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                                                            }`}
                                                    >
                                                        {list.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-3 block">Target Tags</label>
                                            <div className="flex flex-wrap gap-2">
                                                {audienceData.tags.length === 0 ? <span className="text-sm text-zinc-400 italic">No tags</span> : audienceData.tags.map(tag => {
                                                    const isSelected = selectedTags.includes(tag._id);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={tag._id}
                                                            onClick={() => setSelectedTags(p => p.includes(tag._id) ? p.filter(id => id !== tag._id) : [...p, tag._id])}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isSelected ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                                                                }`}
                                                        >
                                                            {tag.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {createError && <div className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">{createError}</div>}

                                <div className="pt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={creating || !newName || !selectedTemplateName || (selectedLists.length === 0 && selectedTags.length === 0) || Object.values(templateVariables).some(v => v === "")}
                                        className="bg-emerald-600 text-white rounded-xl px-8 py-3 text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full md:w-auto"
                                    >
                                        {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                        Launch Campaign
                                    </button>
                                </div>
                            </form>
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
                                                <div className="text-[10px] text-[#667781] text-right mt-1 px-1">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <span className="text-[#53BDEB] inline-block ml-0.5">✓✓</span></div>
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
                </div>
            </div>
        );
    }

    if (view === "detail" && activeCampaign) {
        const progress = Math.round(((activeCampaign.successfulSends + activeCampaign.failedSends) / activeCampaign.totalContacts) * 100) || 0;

        return (
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setView("list"); fetchCampaigns(); }} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-3">
                                {activeCampaign.name}
                                {getStatusBadge(activeCampaign.status)}
                            </h2>
                            <p className="text-zinc-500 text-sm mt-1">Using template: <span className="font-medium text-zinc-700">{activeCampaign.templateName}</span></p>
                        </div>
                    </div>
                    {isPolling && <span className="text-xs font-bold text-emerald-600 animate-pulse flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Live tracking</span>}
                </div>

                <div className="p-6 md:p-8 bg-zinc-50/50">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Progress Header */}
                        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-1">Total Audience</p>
                                    <p className="text-3xl font-black text-zinc-900">{activeCampaign.totalContacts}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-1">Delivered</p>
                                    <p className="text-3xl font-black text-emerald-600">{activeCampaign.successfulSends}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-1">Failed</p>
                                    <p className="text-3xl font-black text-red-600">{activeCampaign.failedSends}</p>
                                </div>
                            </div>

                            <div className="h-4 bg-zinc-100 rounded-full overflow-hidden flex w-full">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${(activeCampaign.successfulSends / activeCampaign.totalContacts) * 100}%` }}
                                ></div>
                                <div
                                    className="h-full bg-red-400 transition-all duration-500"
                                    style={{ width: `${(activeCampaign.failedSends / activeCampaign.totalContacts) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-right text-xs text-zinc-400 mt-2 font-medium">{progress}% Completed</p>
                        </div>

                        {/* Recent Activity Table */}
                        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                                <h3 className="font-bold text-zinc-900">Message Queue Log</h3>
                                <button onClick={() => fetchCampaignDetail(activeCampaign._id)} className="text-zinc-500 hover:text-zinc-900 transition-colors">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="overflow-x-auto max-h-[400px]">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white sticky top-0 border-b border-zinc-100 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold text-zinc-500">Contact</th>
                                            <th className="px-6 py-3 font-semibold text-zinc-500">Phone</th>
                                            <th className="px-6 py-3 font-semibold text-zinc-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {campaignMessages.length === 0 ? (
                                            <tr><td colSpan={3} className="px-6 py-8 text-center text-zinc-500">Loading queue...</td></tr>
                                        ) : campaignMessages.map(msg => (
                                            <tr key={msg._id} className="hover:bg-zinc-50/50 transition-colors">
                                                <td className="px-6 py-3 font-medium text-zinc-900">{msg.contactId?.name || "Unknown"}</td>
                                                <td className="px-6 py-3 text-zinc-500">{msg.phone}</td>
                                                <td className="px-6 py-3">
                                                    {msg.status === "sent" ? (
                                                        <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs"><CheckCircle2 className="w-4 h-4" /> Sent</span>
                                                    ) : msg.status === "failed" ? (
                                                        <div className="flex flex-col">
                                                            <span className="flex items-center gap-1.5 text-red-600 font-medium text-xs"><XCircle className="w-4 h-4" /> Failed</span>
                                                            <span className="text-[10px] text-red-400 truncate max-w-[200px] mt-0.5" title={msg.errorMessage}>{msg.errorMessage}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-zinc-400 font-medium text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Queued</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-zinc-200">
                <div className="flex items-center gap-3 pl-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900">Broadcast Campaigns</h3>
                        <p className="text-xs text-zinc-500">Bulk send WhatsApp templates to your lists and tags.</p>
                    </div>
                </div>

                <button
                    onClick={() => setView("create")}
                    className="bg-zinc-900 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Campaign
                </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-[300px]">
                        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-zinc-500 bg-zinc-50/30">
                        <Megaphone className="w-12 h-12 text-zinc-300 mb-4" />
                        <p className="font-semibold text-zinc-900">No campaigns yet</p>
                        <p className="text-sm mt-1">Click Create Campaign to launch your first broadcast.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/80 border-b border-zinc-100">
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Campaign Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Template</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Progress</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {campaigns.map(campaign => (
                                    <tr
                                        key={campaign._id}
                                        onClick={() => { setActiveCampaign(campaign); setView("detail"); fetchCampaignDetail(campaign._id); }}
                                        className="hover:bg-zinc-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-semibold text-zinc-900">{campaign.name}</td>
                                        <td className="px-6 py-4 text-zinc-600 text-sm">{campaign.templateName}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 max-w-[100px] h-2 bg-zinc-100 rounded-full overflow-hidden flex">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${(campaign.successfulSends / campaign.totalContacts) * 100}%` }}></div>
                                                    <div className="h-full bg-red-400" style={{ width: `${(campaign.failedSends / campaign.totalContacts) * 100}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold text-zinc-400">{campaign.successfulSends}/{campaign.totalContacts}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(campaign.status)}</td>
                                        <td className="px-6 py-4 text-right text-xs text-zinc-500 font-medium">
                                            {new Date(campaign.createdAt).toLocaleDateString()}
                                            <span className="block text-[10px] text-zinc-400 mt-0.5">{new Date(campaign.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
