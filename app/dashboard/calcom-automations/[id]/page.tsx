"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ReactFlow, Background, Controls, useNodesState, useEdgesState,
    addEdge, Connection, Edge, Node, ReactFlowProvider, Panel
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    Save, ChevronLeft, Loader2, MessageSquare, Clock, Layout,
    Calendar, Wand2, Code, X, Download, Upload, Activity, RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import dagre from "dagre";

import { nodeTypes as chatbotNodeTypes } from "../../automation/[id]/components/CustomNodes";
import { calcomNodeTypes } from "../components/CalcomNodes";

const allNodeTypes = { ...chatbotNodeTypes, ...calcomNodeTypes };

const generateId = () => Math.random().toString(36).substr(2, 9);

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    dagreGraph.setGraph({ rankdir: "TB" });
    nodes.forEach(n => dagreGraph.setNode(n.id, { width: 300, height: 250 }));
    edges.forEach(e => dagreGraph.setEdge(e.source, e.target));
    dagre.layout(dagreGraph);
    return {
        nodes: nodes.map(n => {
            const pos = dagreGraph.node(n.id);
            return { ...n, position: { x: pos.x - 150, y: pos.y - 125 } };
        }),
        edges,
    };
};

const CALCOM_TRIGGER_LABELS: Record<string, string> = {
    calcom_booking_created: "📅 Booking Created",
    calcom_booking_cancelled: "❌ Booking Cancelled",
    calcom_booking_rescheduled: "🔄 Booking Rescheduled",
    calcom_reminder: "⏰ Meeting Reminder",
};

function CalcomFlowBuilder() {
    const params = useParams();
    const router = useRouter();
    const flowId = params.id as string;

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [flowName, setFlowName] = useState("");
    const [flowTriggerType, setFlowTriggerType] = useState("calcom_booking_created");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showJsonModal, setShowJsonModal] = useState(false);
    const [jsonInput, setJsonInput] = useState("");
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    useEffect(() => { if (flowId) fetchFlow(); }, [flowId]);

    const getInitialNodes = (triggerType: string): Node[] => [{
        id: "calcom-trigger-1",
        type: "calcomTriggerNode",
        position: { x: 250, y: 50 },
        data: { triggerType: triggerType || "calcom_booking_created" },
    }];

    const fetchFlow = async () => {
        try {
            const res = await fetch(`/api/automation/flows/${flowId}`);
            const data = await res.json();
            if (data.success && data.flow) {
                setFlowName(data.flow.name);
                setFlowTriggerType(data.flow.triggerType || "calcom_booking_created");
                const savedNodes = data.flow.flowData?.nodes || [];
                const savedEdges = data.flow.flowData?.edges || [];
                setNodes(savedNodes.length > 0 ? savedNodes : getInitialNodes(data.flow.triggerType));
                setEdges(savedEdges);
            } else {
                toast.error("Flow not found");
                router.push("/dashboard/calcom-automations");
            }
        } catch {
            toast.error("Failed to load flow");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (!reactFlowInstance) return;
            const flowData = reactFlowInstance.toObject();
            const triggerNode = flowData.nodes.find((n: any) => n.type === "calcomTriggerNode");
            const payload = {
                flowData: { nodes: flowData.nodes, edges: flowData.edges },
                triggerType: triggerNode?.data?.triggerType || flowTriggerType,
                calcomEventTypes: triggerNode?.data?.calcomEventTypes || [],
                source: "calcom",
            };
            const res = await fetch(`/api/automation/flows/${flowId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) toast.success("Workflow saved!");
            else toast.error("Failed to save");
        } catch {
            toast.error("Error saving");
        } finally {
            setSaving(false);
        }
    };

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } } as Edge, eds)),
        [setEdges]
    );

    const onLayout = useCallback(() => {
        const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges);
        setNodes([...ln]);
        setEdges([...le]);
        setTimeout(() => reactFlowInstance?.fitView({ padding: 0.2, duration: 800 }), 50);
    }, [nodes, edges, reactFlowInstance, setNodes, setEdges]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        if (!reactFlowWrapper.current || !reactFlowInstance) return;
        const type = event.dataTransfer.getData("application/reactflow");
        if (!type) return;
        const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        setNodes(nds => nds.concat({ id: `${type}-${generateId()}`, type, position, data: {} }));
    }, [reactFlowInstance, setNodes]);

    if (loading) return (
        <div className="flex items-center justify-center p-12 min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
    );

    const SidebarItem = ({ label, subLabel, color, icon: Icon, nodeType }: { label: string; subLabel: string; color: string; icon: any; nodeType: string }) => (
        <div
            className={`bg-white border ${color} shadow-sm rounded-xl p-3 flex items-center gap-3 cursor-grab hover:ring-2 transition-all`}
            onDragStart={e => { e.dataTransfer.setData("application/reactflow", nodeType); e.dataTransfer.effectAllowed = "move"; }}
            draggable
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color.replace("border-", "bg-").replace("-200", "-100")}`}>
                <Icon className={`w-4 h-4 ${color.replace("border-", "text-").replace("-200", "-600")}`} />
            </div>
            <div>
                <div className="text-sm font-bold text-zinc-900">{label}</div>
                <div className="text-[10px] text-zinc-500">{subLabel}</div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] -m-6 bg-zinc-50 overflow-hidden">
            {/* Topbar */}
            <div className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/dashboard/calcom-automations")} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            {flowName}
                        </h1>
                        <p className="text-xs text-zinc-500">{CALCOM_TRIGGER_LABELS[flowTriggerType] || flowTriggerType}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onLayout} className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200">
                        <Wand2 className="w-4 h-4" /> Auto-arrange
                    </button>
                    <button onClick={() => { if (reactFlowInstance) { const f = reactFlowInstance.toObject(); setJsonInput(JSON.stringify({ nodes: f.nodes, edges: f.edges }, null, 2)); setShowJsonModal(true); } }} className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-200">
                        <Code className="w-4 h-4" /> JSON
                    </button>
                    <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2 shadow-sm">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Flow
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-white border-r border-zinc-200 p-4 flex flex-col gap-4 overflow-y-auto z-10">
                    <div>
                        <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Cal.com Nodes
                        </h3>
                        <div className="space-y-2">
                            <SidebarItem label="Cal.com Trigger" subLabel="Start of every flow" color="border-blue-200" icon={Calendar} nodeType="calcomTriggerNode" />
                            <SidebarItem label="Send Template" subLabel="Approved WA template" color="border-purple-200" icon={Layout} nodeType="calcomTemplateNode" />
                            <SidebarItem label="Delay" subLabel="Wait before next step" color="border-orange-200" icon={Clock} nodeType="delayNode" />
                        </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-4">
                        <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Nodes
                        </h3>
                        <div className="space-y-2">
                            <SidebarItem label="Send Message" subLabel="Text, buttons, or list" color="border-emerald-200" icon={MessageSquare} nodeType="sendMessageNode" />
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-zinc-100">
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                            <h4 className="text-xs font-bold text-blue-900 mb-1">Using Variables</h4>
                            <p className="text-[10px] text-blue-700">Type {"{{invitee_name}}"}, {"{{meeting_date}}"} etc. in any message to insert real booking data.</p>
                        </div>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes} edges={edges}
                        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                        onConnect={onConnect} onInit={setReactFlowInstance}
                        onDrop={onDrop} onDragOver={onDragOver}
                        nodeTypes={allNodeTypes as any}
                        fitView attributionPosition="bottom-right"
                        minZoom={0.4} maxZoom={1.5}
                    >
                        <Background color="#ccc" gap={20} size={1} />
                        <Controls className="bg-white shadow-md border border-zinc-200 rounded-lg overflow-hidden" />
                    </ReactFlow>
                </div>
            </div>

            {/* JSON Modal */}
            {showJsonModal && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
                            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Code className="w-5 h-5 text-blue-500" /> Flow JSON</h2>
                            <button onClick={() => setShowJsonModal(false)} className="p-2 hover:bg-zinc-200 rounded-lg text-zinc-500"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto bg-zinc-50">
                            <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                                className="w-full h-[400px] p-4 rounded-xl border border-zinc-200 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs outline-none resize-none leading-relaxed" spellCheck={false} />
                        </div>
                        <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between bg-white shrink-0">
                            <button onClick={() => { navigator.clipboard.writeText(jsonInput); toast.success("Copied!"); }} className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 flex items-center gap-2">
                                <Download className="w-4 h-4" /> Copy
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => setShowJsonModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50">Cancel</button>
                                <button onClick={() => {
                                    try {
                                        const p = JSON.parse(jsonInput);
                                        if (p.nodes) setNodes(p.nodes);
                                        if (p.edges) setEdges(p.edges);
                                        toast.success("Imported!");
                                        setShowJsonModal(false);
                                    } catch { toast.error("Invalid JSON"); }
                                }} className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                                    <Upload className="w-4 h-4" /> Import
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CalcomFlowBuilderWrapper() {
    return (
        <ReactFlowProvider>
            <CalcomFlowBuilder />
        </ReactFlowProvider>
    );
}
