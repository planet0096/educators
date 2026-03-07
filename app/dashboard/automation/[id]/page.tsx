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
import { Save, ChevronLeft, Loader2, MessageSquare, Clock, Settings2 } from "lucide-react";
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

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Flow
                </button>
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
                </div>
            </div>
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
