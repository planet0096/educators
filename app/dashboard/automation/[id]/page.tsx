"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    ReactFlowProvider,
    Panel
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Save, ChevronLeft, Loader2, MessageSquare, Clock, Settings2, Activity, RefreshCw, Code, X, Download, Upload } from "lucide-react";
import toast from "react-hot-toast";

import { nodeTypes } from "./components/CustomNodes";

// Helper to generate simple random IDs without relying on crypto inside React Component
const generateId = () => Math.random().toString(36).substr(2, 9);

function FlowBuilderCanvas() {
    const params = useParams();
    const router = useRouter();
    const flowId = params.id as string;

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const [flowName, setFlowName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Debug panel state
    const [showDebug, setShowDebug] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    // JSON Edit panel state
    const [showJsonModal, setShowJsonModal] = useState(false);
    const [jsonInput, setJsonInput] = useState("");

    // Note: We need a ref to access the latest state inside the callback if needed
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (flowId) {
            fetchFlow();
        }
    }, [flowId]);



    const fetchFlow = async () => {
        // Initial Trigger Node template
        const initialNodes = [
            {
                id: 'trigger-1',
                type: 'triggerNode',
                position: { x: 250, y: 50 },
                data: {
                    triggerType: 'keyword',
                    keywords: '',
                },
            }
        ];

        try {
            const res = await fetch(`/api/automation/flows/${flowId}`);
            const data = await res.json();

            if (data.success && data.flow) {
                setFlowName(data.flow.name);

                const savedNodes = data.flow.flowData?.nodes || [];
                const savedEdges = data.flow.flowData?.edges || [];

                if (savedNodes.length > 0) {
                    setNodes(savedNodes);
                    setEdges(savedEdges);
                } else {
                    setNodes(initialNodes);
                }
            } else {
                toast.error("Flow not found");
                router.push("/dashboard/automation");
            }
        } catch (error) {
            console.error("Error fetching flow", error);
            toast.error("Failed to load flow");
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        setLoadingSessions(true);
        try {
            const res = await fetch(`/api/automation/flows/${flowId}/sessions`);
            const data = await res.json();
            if (data.success) {
                setSessions(data.sessions || []);
            }
        } catch (e) {
            console.error("Failed to fetch sessions", e);
            toast.error("Failed to load debug logs");
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleOpenJsonModal = () => {
        if (!reactFlowInstance) return;
        const flowData = reactFlowInstance.toObject();

        const cleanFlowData = {
            nodes: flowData.nodes,
            edges: flowData.edges
        };

        setJsonInput(JSON.stringify(cleanFlowData, null, 2));
        setShowJsonModal(true);
    };

    const handleImportJson = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (parsed.nodes && Array.isArray(parsed.nodes)) {
                setNodes(parsed.nodes);
            }
            if (parsed.edges && Array.isArray(parsed.edges)) {
                setEdges(parsed.edges);
            }
            toast.success("Flow imported successfully! Don't forget to save.", { position: "top-center" });
            setShowJsonModal(false);
            setSaving(false); // To prompt the user to specifically hit the Save Flow button after parsing
        } catch (err) {
            console.error("Failed to parse JSON", err);
            toast.error("Invalid JSON format. Please check the structure.");
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (!reactFlowInstance) return;

            const flowData = reactFlowInstance.toObject();

            // Data is purely saved as is, because functions are no longer in data
            const cleanNodes = flowData.nodes;

            const cleanFlowData = {
                ...flowData,
                nodes: cleanNodes
            };

            const triggerNode = cleanNodes.find((n: any) => n.type === 'triggerNode');
            const keywordsRaw = triggerNode?.data?.keywords || "";
            const keywordsArray = keywordsRaw.split(",").map((k: string) => k.trim()).filter(Boolean);

            const payload = {
                flowData: cleanFlowData,
                triggerType: triggerNode?.data?.triggerType || "keyword",
                keywords: keywordsArray
            };

            const res = await fetch(`/api/automation/flows/${flowId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Flow saved successfully");
            } else {
                toast.error("Failed to save flow");
            }
        } catch (error) {
            console.error("Save error", error);
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } } as Edge, eds)),
        [setEdges]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current || !reactFlowInstance) return;

            const type = event.dataTransfer.getData('application/reactflow');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: `${type}-${generateId()}`,
                type,
                position,
                data: {},
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] -m-6 bg-zinc-50 overflow-hidden">
            {/* Topbar */}
            <div className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm relative">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/dashboard/automation")}
                        className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900">{flowName}</h1>
                        <p className="text-xs text-zinc-500">Auto-saves disabled. Click Save Flow to persist changes.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenJsonModal}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    >
                        <Code className="w-4 h-4" />
                        Code / JSON
                    </button>

                    <button
                        onClick={() => {
                            setShowDebug(!showDebug);
                            if (!showDebug) fetchSessions();
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${showDebug ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                    >
                        <Activity className="w-4 h-4" />
                        {showDebug ? "Hide Logs" : "Live Logs"}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Flow
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-white border-r border-zinc-200 p-4 flex flex-col gap-4 overflow-y-auto z-10">
                    <div className="mb-2">
                        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Nodes Components</h3>
                        <p className="text-xs text-zinc-500 mt-1">Drag and drop into the canvas</p>
                    </div>

                    <div
                        className="bg-white border border-emerald-200 shadow-sm rounded-xl p-3 flex items-center gap-3 cursor-grab hover:ring-2 hover:ring-emerald-500/20 transition-all hover:border-emerald-500"
                        onDragStart={(event) => {
                            event.dataTransfer.setData('application/reactflow', 'sendMessageNode');
                            event.dataTransfer.effectAllowed = 'move';
                        }}
                        draggable
                    >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-zinc-900">Send Message</div>
                            <div className="text-[10px] text-zinc-500">Send WhatsApp text</div>
                        </div>
                    </div>

                    <div
                        className="bg-white border border-amber-200 shadow-sm rounded-xl p-3 flex items-center gap-3 cursor-grab hover:ring-2 hover:ring-amber-500/20 transition-all hover:border-amber-500"
                        onDragStart={(event) => {
                            event.dataTransfer.setData('application/reactflow', 'waitReplyNode');
                            event.dataTransfer.effectAllowed = 'move';
                        }}
                        draggable
                    >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-zinc-900">Wait for Reply</div>
                            <div className="text-[10px] text-zinc-500">Pause until user replies</div>
                        </div>
                    </div>

                    <div
                        className="bg-white border border-pink-200 shadow-sm rounded-xl p-3 flex items-center gap-3 cursor-grab hover:ring-2 hover:ring-pink-500/20 transition-all hover:border-pink-500"
                        onDragStart={(event) => {
                            event.dataTransfer.setData('application/reactflow', 'conditionNode');
                            event.dataTransfer.effectAllowed = 'move';
                        }}
                        draggable
                    >
                        <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center shrink-0">
                            <Settings2 className="w-4 h-4 text-pink-600" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-zinc-900">Condition</div>
                            <div className="text-[10px] text-zinc-500">Branch True/False</div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-zinc-100">
                        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                            <h4 className="text-xs font-bold text-indigo-900 mb-1">Pro Tip</h4>
                            <p className="text-[10px] text-indigo-700">Connect output ports (bottom) to input ports (top) by dragging lines between nodes.</p>
                        </div>
                    </div>
                </div>

                {/* React Flow Canvas */}
                <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        nodeTypes={nodeTypes as any}
                        fitView
                        attributionPosition="bottom-right"
                        minZoom={0.5}
                        maxZoom={1.5}
                        className="bg-[#f8f9fa]" // Very subtle gray to make white nodes pop
                    >
                        <Background color="#ccc" gap={20} size={1} />
                        <Controls className="bg-white shadow-md border border-zinc-200 rounded-lg overflow-hidden fill-zinc-600" />
                        {/* <MiniMap className="bg-white shadow-lg rounded-xl border border-zinc-200" zoomable pannable /> */}
                    </ReactFlow>

                    {/* Debug sidebar overlaid on React flow canvas */}
                    {showDebug && (
                        <div className="absolute top-4 right-4 bottom-4 w-80 bg-white border border-zinc-200 rounded-2xl flex flex-col z-[100] shadow-2xl overflow-hidden">
                            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
                                <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-indigo-500" />
                                    Live Execution Logs
                                </h3>
                                <button onClick={fetchSessions} disabled={loadingSessions} className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-500 transition-colors disabled:opacity-50">
                                    <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-zinc-50/50">
                                {sessions.length === 0 ? (
                                    <div className="text-center text-zinc-500 text-sm py-8 flex flex-col items-center gap-2">
                                        <Activity className="w-8 h-8 text-zinc-300" />
                                        <p>No execution logs yet.</p>
                                        <p className="text-xs text-zinc-400">Test your flow on WhatsApp to see live data here.</p>
                                    </div>
                                ) : (
                                    sessions.map(sess => (
                                        <div key={sess._id} className="border border-zinc-200 rounded-xl p-3 text-sm shadow-sm bg-white hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="font-semibold text-zinc-900 border border-zinc-200 px-2 py-0.5 rounded-md text-xs bg-zinc-50">+{sess.contactPhone}</span>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${sess.status === 'active' ? 'bg-amber-100 text-amber-700 border border-amber-200' : sess.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                    {sess.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-zinc-600 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-zinc-500">Node</span>
                                                    <span className="font-mono text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 truncate max-w-[150px]" title={sess.currentNodeId}>{sess.currentNodeId}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                                                    <span className="text-[10px] text-zinc-400">Last updated</span>
                                                    <span className="text-[10px] text-zinc-500 font-medium">{new Date(sess.updatedAt).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* JSON Import/Export Modal */}
            {showJsonModal && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
                            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                                <Code className="w-5 h-5 text-indigo-500" />
                                Flow JSON Source
                            </h2>
                            <button
                                onClick={() => setShowJsonModal(false)}
                                className="p-2 hover:bg-zinc-200 rounded-lg text-zinc-500 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto bg-zinc-50">
                            <p className="text-sm text-zinc-600 mb-4 font-medium">
                                Review your current automation logic or paste a pre-built JSON bot to import it directly into the visual canvas.
                            </p>
                            <textarea
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                className="w-full h-[400px] p-4 rounded-xl border border-zinc-200 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none leading-relaxed"
                                spellCheck={false}
                            />
                        </div>

                        <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between bg-white shrink-0">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(jsonInput);
                                    toast.success("JSON copied to clipboard!");
                                }}
                                className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Copy to Clipboard
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowJsonModal(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImportJson}
                                    className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <Upload className="w-4 h-4" />
                                    Import JSON to Canvas
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AutomationBuilderWrapper() {
    return (
        <ReactFlowProvider>
            <FlowBuilderCanvas />
        </ReactFlowProvider>
    );
}
