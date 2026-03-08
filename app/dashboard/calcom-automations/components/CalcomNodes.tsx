"use client";

import { memo } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { Calendar, Clock, Trash2, Layout, Plus, X } from "lucide-react";

const CALCOM_VARIABLES = [
    { key: "{{invitee_name}}", label: "Invitee Name" },
    { key: "{{invitee_phone}}", label: "Invitee Phone" },
    { key: "{{invitee_email}}", label: "Invitee Email" },
    { key: "{{meeting_date}}", label: "Meeting Date" },
    { key: "{{meeting_link}}", label: "Meeting Link" },
    { key: "{{organizer_name}}", label: "Organizer Name" },
    { key: "{{event_type}}", label: "Event Type" },
];

// --- Cal.com Trigger Node ---
export const CalcomTriggerNode = memo(({ data, isConnectable, id }: NodeProps) => {
    const { updateNodeData } = useReactFlow();

    return (
        <div className="bg-white border-2 border-blue-500 rounded-xl shadow-lg w-72 overflow-hidden">
            <div className="bg-blue-600 text-white p-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <div className="font-bold text-sm">Cal.com Trigger</div>
                <div className="ml-auto text-[10px] bg-blue-500 px-2 py-0.5 rounded-full font-semibold">CAL</div>
            </div>
            <div className="p-4 space-y-3">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">When this happens...</div>
                <select
                    value={(data?.triggerType as string) || "calcom_booking_created"}
                    onChange={(e) => updateNodeData(id, { triggerType: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 nodrag"
                >
                    <option value="calcom_booking_created">📅 Booking Created</option>
                    <option value="calcom_booking_cancelled">❌ Booking Cancelled</option>
                    <option value="calcom_booking_rescheduled">🔄 Booking Rescheduled</option>
                    <option value="calcom_reminder">⏰ Meeting Reminder</option>
                </select>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                        Available Variables
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {CALCOM_VARIABLES.map((v) => (
                            <span
                                key={v.key}
                                title={v.key}
                                className="text-[10px] bg-white border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-mono cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => navigator.clipboard.writeText(v.key)}
                            >
                                {v.label}
                            </span>
                        ))}
                    </div>
                    <p className="text-[9px] text-blue-500 mt-1">Click a variable to copy it</p>
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                id="a"
                isConnectable={isConnectable}
                className="w-3 h-3 bg-blue-500"
            />
        </div>
    );
});
CalcomTriggerNode.displayName = "CalcomTriggerNode";

// --- Cal.com Template Node ---
export const CalcomTemplateNode = memo(({ data, isConnectable, id }: NodeProps) => {
    const { updateNodeData, deleteElements } = useReactFlow();
    const mappings: string[] = (data?.variableMappings as string[]) || ["", "", ""];

    const updateMapping = (index: number, value: string) => {
        const newMappings = [...mappings];
        newMappings[index] = value;
        updateNodeData(id, { variableMappings: newMappings });
    };

    return (
        <div className="bg-white border-2 border-purple-500 rounded-xl shadow-lg w-72 overflow-hidden group">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-purple-500" />
            <div className="bg-purple-600 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layout className="w-5 h-5" />
                    <div className="font-bold text-sm">Send WA Template</div>
                </div>
                <button onClick={() => deleteElements({ nodes: [{ id }] })} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-purple-700 rounded">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4 space-y-3">
                <div className="space-y-1">
                    <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Template Name</div>
                    <input
                        type="text"
                        value={(data?.templateName as string) || ""}
                        onChange={(e) => updateNodeData(id, { templateName: e.target.value })}
                        placeholder="e.g. booking_confirmation"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 nodrag"
                    />
                </div>
                <div className="space-y-1">
                    <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Language Code</div>
                    <input
                        type="text"
                        value={(data?.languageCode as string) || "en_US"}
                        onChange={(e) => updateNodeData(id, { languageCode: e.target.value })}
                        placeholder="en_US"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 nodrag"
                    />
                </div>
                <div className="space-y-2">
                    <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Variable Mapping</div>
                    <p className="text-[10px] text-zinc-400">Map Cal.com data to your template variables ({"{{1}}"}, {"{{2}}"}, {"{{3}}"})</p>
                    {mappings.map((val, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-1 rounded shrink-0">
                                {`{{${i + 1}}}`}
                            </span>
                            <select
                                value={val}
                                onChange={(e) => updateMapping(i, e.target.value)}
                                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 nodrag"
                            >
                                <option value="">-- Select variable --</option>
                                {CALCOM_VARIABLES.map((v) => (
                                    <option key={v.key} value={v.key}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} id="a" isConnectable={isConnectable} className="w-3 h-3 bg-purple-500" />
        </div>
    );
});
CalcomTemplateNode.displayName = "CalcomTemplateNode";

// --- Delay Node ---
export const DelayNode = memo(({ data, isConnectable, id }: NodeProps) => {
    const { updateNodeData, deleteElements } = useReactFlow();

    return (
        <div className="bg-white border-2 border-orange-500 rounded-xl shadow-lg w-72 overflow-hidden group">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-orange-500" />
            <div className="bg-orange-500 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <div className="font-bold text-sm">Delay</div>
                </div>
                <button onClick={() => deleteElements({ nodes: [{ id }] })} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-orange-600 rounded">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4 space-y-3">
                <p className="text-xs text-zinc-500">Wait before sending the next message. Useful for follow-up reminders.</p>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="1"
                        value={(data?.delayMinutes as number) || 60}
                        onChange={(e) => updateNodeData(id, { delayMinutes: parseInt(e.target.value) || 60 })}
                        className="w-24 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 nodrag text-center font-bold"
                    />
                    <select
                        value={(data?.delayUnit as string) || "minutes"}
                        onChange={(e) => updateNodeData(id, { delayUnit: e.target.value })}
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 nodrag"
                    >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                    </select>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 text-[10px] text-orange-700">
                    ⚡ Powered by QStash — messages are scheduled and delivered even if the server restarts.
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} id="a" isConnectable={isConnectable} className="w-3 h-3 bg-orange-500" />
        </div>
    );
});
DelayNode.displayName = "DelayNode";

export const calcomNodeTypes = {
    calcomTriggerNode: CalcomTriggerNode,
    calcomTemplateNode: CalcomTemplateNode,
    delayNode: DelayNode,
};
