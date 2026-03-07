"use client";

import { memo } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { MessageSquare, Zap, Clock, Type, Settings2, Trash2 } from "lucide-react";

// --- Trigger Node ---
export const TriggerNode = memo(({ data, isConnectable, id }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    return (
        <div className="bg-white border-2 border-indigo-500 rounded-xl shadow-lg w-72 overflow-hidden">
            <div className="bg-indigo-500 text-white p-3 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <div className="font-bold text-sm">Flow Trigger</div>
            </div>
            <div className="p-4 space-y-3">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Trigger Type</div>
                <select
                    value={(data?.triggerType as string) || 'keyword'}
                    onChange={(e) => updateNodeData(id, { triggerType: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 nodrag"
                >
                    <option value="keyword">Keyword Match</option>
                    <option value="first_contact">First Contact</option>
                    <option value="catch_all">Catch All Replies</option>
                </select>

                {((data?.triggerType === "keyword") || !data?.triggerType) && (
                    <div className="space-y-1">
                        <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Keywords</div>
                        <input
                            type="text"
                            value={(data?.keywords as string) || ''}
                            onChange={(e) => updateNodeData(id, { keywords: e.target.value })}
                            placeholder="e.g. hello, hi, pricing"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 nodrag"
                        />
                        <p className="text-[10px] text-zinc-400">Comma separated</p>
                    </div>
                )}
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                id="a"
                isConnectable={isConnectable}
                className="w-3 h-3 bg-indigo-500"
            />
        </div>
    );
});
TriggerNode.displayName = "TriggerNode";

// --- Send Message Node ---
export const SendMessageNode = memo(({ data, isConnectable, id }: NodeProps) => {
    const { updateNodeData, deleteElements } = useReactFlow();
    return (
        <div className="bg-white border-2 border-emerald-500 rounded-xl shadow-lg w-72 overflow-hidden group">
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-emerald-500"
            />
            <div className="bg-emerald-500 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <div className="font-bold text-sm">Send Message</div>
                </div>
                <button onClick={() => deleteElements({ nodes: [{ id }] })} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-emerald-600 rounded">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4 space-y-3">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Message Text</div>
                <textarea
                    value={(data?.message as string) || ''}
                    onChange={(e) => updateNodeData(id, { message: e.target.value })}
                    placeholder="Enter message to send..."
                    rows={4}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none nodrag"
                    style={{ minHeight: '80px' }}
                />
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                id="a"
                isConnectable={isConnectable}
                className="w-3 h-3 bg-emerald-500"
            />
        </div>
    );
});
SendMessageNode.displayName = "SendMessageNode";

// --- Wait For Reply Node ---
export const WaitReplyNode = memo(({ data, isConnectable, id }: NodeProps) => {
    const { updateNodeData, deleteElements } = useReactFlow();
    return (
        <div className="bg-white border-2 border-amber-500 rounded-xl shadow-lg w-72 overflow-hidden group">
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-amber-500"
            />
            <div className="bg-amber-500 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <div className="font-bold text-sm">Wait for Reply</div>
                </div>
                <button onClick={() => deleteElements({ nodes: [{ id }] })} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-amber-600 rounded">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4 space-y-3">
                <p className="text-sm text-zinc-600">
                    Flow will pause until the user replies. The reply will be stored for the next condition.
                </p>
                <div className="space-y-1">
                    <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Save Reply To Variable (Optional)</div>
                    <input
                        type="text"
                        value={(data?.variableName as string) || ''}
                        onChange={(e) => updateNodeData(id, { variableName: e.target.value })}
                        placeholder="e.g. user_name"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 nodrag"
                    />
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                id="a"
                isConnectable={isConnectable}
                className="w-3 h-3 bg-amber-500"
            />
        </div>
    );
});
WaitReplyNode.displayName = "WaitReplyNode";

// --- Condition Node ---
export const ConditionNode = memo(({ data, isConnectable, id }: NodeProps) => {
    const { updateNodeData, deleteElements } = useReactFlow();
    return (
        <div className="bg-white border-2 border-pink-500 rounded-xl shadow-lg w-72 overflow-hidden group">
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-pink-500"
            />
            <div className="bg-pink-500 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5" />
                    <div className="font-bold text-sm">Condition branch</div>
                </div>
                <button onClick={() => deleteElements({ nodes: [{ id }] })} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-pink-600 rounded">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4 space-y-3">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">If Reply Matches</div>
                <input
                    type="text"
                    value={(data?.condition as string) || ''}
                    onChange={(e) => updateNodeData(id, { condition: e.target.value })}
                    placeholder="e.g. yes, 1, agree"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 nodrag"
                />
            </div>

            <div className="relative h-12 bg-zinc-50 border-t border-zinc-100">
                <div className="absolute left-6 bottom-0 translate-y-1/2 flex items-center justify-center p-1 bg-white ring-1 ring-zinc-200 rounded-md text-[10px] font-bold text-emerald-600 z-10 w-fit">
                    TRUE
                </div>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="true"
                    isConnectable={isConnectable}
                    className="w-3 h-3 bg-emerald-500 left-8"
                />

                <div className="absolute right-6 bottom-0 translate-y-1/2 flex items-center justify-center p-1 bg-white ring-1 ring-zinc-200 rounded-md text-[10px] font-bold text-red-600 z-10 w-fit">
                    FALSE
                </div>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="false"
                    isConnectable={isConnectable}
                    className="w-3 h-3 bg-red-500 right-8 left-auto"
                />
            </div>
        </div>
    );
});
ConditionNode.displayName = "ConditionNode";

export const nodeTypes = {
    triggerNode: TriggerNode,
    sendMessageNode: SendMessageNode,
    waitReplyNode: WaitReplyNode,
    conditionNode: ConditionNode,
};
