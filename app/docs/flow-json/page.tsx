"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Zap, MessageSquare, Clock, Settings2, Database, ExternalLink } from "lucide-react";

// ─── Small Code Block ────────────────────────────────────────────────────────
function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        // For JSON blocks: re-stringify after parsing to guarantee all control
        // characters are properly escaped. If parsing fails (e.g. pseudocode with
        // JS comments), fall back to the raw code string.
        let text = code;
        try {
            const parsed = JSON.parse(code);
            text = JSON.stringify(parsed, null, 2);
        } catch {
            // Not valid JSON (contains comments etc.) — copy as-is
        }
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative rounded-xl overflow-hidden border border-zinc-700 shadow-lg my-4">
            <div className="flex items-center justify-between bg-zinc-800 px-4 py-2 border-b border-zinc-700">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">{language}</span>
                <button
                    onClick={copy}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>
            <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">{code}</pre>
        </div>
    );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────
function Section({
    id,
    icon,
    color,
    title,
    badge,
    children,
}: {
    id: string;
    icon: React.ReactNode;
    color: string;
    title: string;
    badge?: string;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(true);

    return (
        <section id={id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <button
                onClick={() => setOpen(!open)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
                    <h2 className="text-base font-bold text-zinc-900">{title}</h2>
                    {badge && (
                        <span className="text-xs font-mono bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-md">
                            {badge}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>
            {open && <div className="px-6 pb-6 border-t border-zinc-100">{children}</div>}
        </section>
    );
}

// ─── Field Table ─────────────────────────────────────────────────────────────
function FieldTable({
    fields,
}: {
    fields: { name: string; type: string; required: boolean; description: string }[];
}) {
    return (
        <div className="overflow-x-auto mt-4 rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-zinc-500 uppercase tracking-wider w-36">Field</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-zinc-500 uppercase tracking-wider w-24">Type</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-zinc-500 uppercase tracking-wider w-20">Required</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</th>
                    </tr>
                </thead>
                <tbody>
                    {fields.map((f, i) => (
                        <tr key={i} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-xs text-indigo-600 font-semibold">{f.name}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{f.type}</td>
                            <td className="px-4 py-2.5">
                                {f.required ? (
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">Yes</span>
                                ) : (
                                    <span className="text-xs text-zinc-400 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-md">Optional</span>
                                )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-zinc-600 leading-relaxed">{f.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Alert ───────────────────────────────────────────────────────────────────
function Alert({ type, children }: { type: "info" | "warning" | "tip"; children: React.ReactNode }) {
    const styles = {
        info: "bg-indigo-50 border-indigo-200 text-indigo-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800",
        tip: "bg-emerald-50 border-emerald-200 text-emerald-800",
    };
    const icons = { info: "ℹ️", warning: "⚠️", tip: "💡" };

    return (
        <div className={`border rounded-xl p-4 mt-4 text-xs leading-relaxed flex gap-2 ${styles[type]}`}>
            <span>{icons[type]}</span>
            <div>{children}</div>
        </div>
    );
}

// ─── Full Example — built as a real JS object so JSON.stringify guarantees clean output ───
const FULL_EXAMPLE_JSON = JSON.stringify({
    nodes: [
        {
            id: "trigger-1",
            type: "triggerNode",
            position: { x: 250, y: 50 },
            data: { triggerType: "keyword", keywords: "hi, hello, start, courses" }
        },
        {
            id: "sendMessageNode-greet",
            type: "sendMessageNode",
            position: { x: 250, y: 200 },
            data: { messageType: "text", message: "Welcome! What is your name?" }
        },
        {
            id: "waitReplyNode-name",
            type: "waitReplyNode",
            position: { x: 250, y: 380 },
            data: { variableName: "user_name" }
        },
        {
            id: "updateContactNode-name",
            type: "updateContactNode",
            position: { x: 250, y: 520 },
            data: { field: "name", value: "{{user_name}}" }
        },
        {
            id: "sendMessageNode-menu",
            type: "sendMessageNode",
            position: { x: 250, y: 660 },
            data: {
                messageType: "interactive",
                message: "Nice to meet you, {{user_name}}! What are you interested in?",
                buttons: [
                    { id: "btn_1", title: "IELTS" },
                    { id: "btn_2", title: "Spoken English" },
                    { id: "btn_3", title: "Pricing" }
                ]
            }
        },
        {
            id: "waitReplyNode-interest",
            type: "waitReplyNode",
            position: { x: 250, y: 840 },
            data: {}
        },
        {
            id: "conditionNode-ielts",
            type: "conditionNode",
            position: { x: 100, y: 1000 },
            data: { condition: "ielts" }
        },
        {
            id: "sendMessageNode-ielts",
            type: "sendMessageNode",
            position: { x: 0, y: 1200 },
            data: {
                messageType: "text",
                message: "Our IELTS program is a 6-week intensive course. A counselor will contact you soon!"
            }
        },
        {
            id: "sendMessageNode-other",
            type: "sendMessageNode",
            position: { x: 400, y: 1200 },
            data: {
                messageType: "text",
                message: "Our team will reach out with more details. Thank you, {{user_name}}!"
            }
        }
    ],
    edges: [
        { id: "e1", source: "trigger-1", target: "sendMessageNode-greet", animated: true },
        { id: "e2", source: "sendMessageNode-greet", target: "waitReplyNode-name", animated: true },
        { id: "e3", source: "waitReplyNode-name", target: "updateContactNode-name", animated: true },
        { id: "e4", source: "updateContactNode-name", target: "sendMessageNode-menu", animated: true },
        { id: "e5", source: "sendMessageNode-menu", target: "waitReplyNode-interest", animated: true },
        { id: "e6", source: "waitReplyNode-interest", target: "conditionNode-ielts", animated: true },
        { id: "e7", source: "conditionNode-ielts", sourceHandle: "true", target: "sendMessageNode-ielts" },
        { id: "e8", source: "conditionNode-ielts", sourceHandle: "false", target: "sendMessageNode-other" }
    ]
}, null, 2);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FlowJsonDocsPage() {
    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <div className="bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{`{}`}</span>
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-zinc-900">Flow JSON Reference</h1>
                            <p className="text-xs text-zinc-500">Chatbot Builder — Complete Node Documentation</p>
                        </div>
                    </div>
                    <a
                        href="/dashboard/automation"
                        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Back to Builder
                    </a>
                </div>
            </div>

            {/* Quick Nav */}
            <div className="bg-white border-b border-zinc-200">
                <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6 overflow-x-auto">
                    {[
                        { id: "overview", label: "Overview" },
                        { id: "trigger", label: "Trigger Node" },
                        { id: "sendMessage", label: "Send Message" },
                        { id: "waitReply", label: "Wait for Reply" },
                        { id: "condition", label: "Condition" },
                        { id: "updateContact", label: "Update Contact" },
                        { id: "edges", label: "Edges" },
                        { id: "variables", label: "Variables" },
                        { id: "example", label: "Full Example" },
                    ].map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className="text-xs font-medium text-zinc-500 hover:text-indigo-600 whitespace-nowrap transition-colors"
                        >
                            {item.label}
                        </a>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

                {/* ── Overview ────────────────────────────────────────────── */}
                <section id="overview" className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-zinc-900 mb-2">Overview</h2>
                    <p className="text-sm text-zinc-600 leading-relaxed mb-4">
                        A Chatbot Flow is represented as a JSON object with two top-level arrays: <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-xs">nodes</code> and{" "}
                        <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-xs">edges</code>. Nodes define the logic and messages. Edges define the connections between them.
                    </p>
                    <CodeBlock code={`{
  "nodes": [ ...node objects ],
  "edges": [ ...edge objects ]
}`} />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                        {[
                            { icon: "⚡", label: "triggerNode", color: "bg-indigo-50 border-indigo-200 text-indigo-700", desc: "Starts the flow" },
                            { icon: "💬", label: "sendMessageNode", color: "bg-emerald-50 border-emerald-200 text-emerald-700", desc: "Send WhatsApp messages" },
                            { icon: "⏱️", label: "waitReplyNode", color: "bg-amber-50 border-amber-200 text-amber-700", desc: "Pause for user input" },
                            { icon: "🔀", label: "conditionNode", color: "bg-pink-50 border-pink-200 text-pink-700", desc: "Branch True / False" },
                            { icon: "🗃️", label: "updateContactNode", color: "bg-purple-50 border-purple-200 text-purple-700", desc: "Write data to CRM" },
                        ].map((n) => (
                            <div key={n.label} className={`border rounded-xl p-3 ${n.color}`}>
                                <div className="text-lg mb-1">{n.icon}</div>
                                <div className="font-mono text-xs font-bold">{n.label}</div>
                                <div className="text-xs opacity-80 mt-0.5">{n.desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Base Node Fields ─────────────────────────────────────── */}
                <section className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-base font-bold text-zinc-900 mb-1">Base Node Object Fields</h2>
                    <p className="text-xs text-zinc-500 mb-2">Every node, regardless of type, must include these base fields.</p>
                    <FieldTable
                        fields={[
                            { name: "id", type: "string", required: true, description: "Unique identifier for the node. Must be unique across all nodes in the flow. Convention: type-randomId, e.g. 'sendMessageNode-abc123'" },
                            { name: "type", type: "string", required: true, description: "The node type. One of: triggerNode, sendMessageNode, waitReplyNode, conditionNode, updateContactNode" },
                            { name: "position", type: "{ x, y }", required: true, description: "Canvas position in pixels. Only affects visual placement in the builder, not execution logic." },
                            { name: "data", type: "object", required: true, description: "Node-specific configuration object. Fields vary per node type. See each node section below." },
                        ]}
                    />
                    <CodeBlock code={`{
  "id": "sendMessageNode-abc123",
  "type": "sendMessageNode",
  "position": { "x": 250, "y": 200 },
  "data": {
    ...node-specific fields
  }
}`} />
                </section>

                {/* ── Trigger Node ─────────────────────────────────────────── */}
                <Section
                    id="trigger"
                    icon={<Zap className="w-4 h-4 text-indigo-600" />}
                    color="bg-indigo-100"
                    title="Trigger Node"
                    badge="triggerNode"
                >
                    <p className="text-sm text-zinc-600 leading-relaxed mt-4">
                        Every flow must have exactly <strong>one</strong> Trigger Node. It is the entry point and defines what incoming WhatsApp message activates this flow.
                    </p>
                    <FieldTable
                        fields={[
                            { name: "triggerType", type: "string", required: true, description: "One of: 'keyword' (match on keywords), 'catch_all' (match any message), 'first_contact' (reserved for first-time contacts)" },
                            { name: "keywords", type: "string", required: false, description: "Comma-separated list of keywords to match. Only used when triggerType is 'keyword'. Case-insensitive partial match. e.g. 'hi, hello, hey'" },
                        ]}
                    />
                    <Alert type="warning">
                        Only one Trigger Node is allowed per flow. A flow with no Trigger Node will not execute.
                        <br /><br />
                        Keyword flows are matched first. If no keyword flow matches, the engine falls back to a <code className="font-mono font-bold">catch_all</code> flow.
                    </Alert>
                    <CodeBlock code={`// Keyword-based trigger
{
  "id": "trigger-1",
  "type": "triggerNode",
  "position": { "x": 250, "y": 50 },
  "data": {
    "triggerType": "keyword",
    "keywords": "hi, hello, start, pricing"
  }
}

// Catch-all trigger (matches any message not matched by keyword flows)
{
  "id": "trigger-1",
  "type": "triggerNode",
  "position": { "x": 250, "y": 50 },
  "data": {
    "triggerType": "catch_all"
  }
}`} />
                </Section>

                {/* ── Send Message Node ─────────────────────────────────────── */}
                <Section
                    id="sendMessage"
                    icon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
                    color="bg-emerald-100"
                    title="Send Message Node"
                    badge="sendMessageNode"
                >
                    <p className="text-sm text-zinc-600 leading-relaxed mt-4">
                        Sends a WhatsApp message to the contact. Supports 6 message types: <strong>text, interactive (buttons), list, image, video, document</strong>.
                    </p>

                    <h3 className="font-bold text-sm text-zinc-800 mt-6 mb-2">Common Fields (all types)</h3>
                    <FieldTable
                        fields={[
                            { name: "messageType", type: "string", required: true, description: "One of: 'text', 'interactive', 'list', 'image', 'video', 'document'" },
                            { name: "message", type: "string", required: false, description: "For text/interactive/list: the main message body. For media: an optional caption. Supports {{variable}} interpolation." },
                        ]}
                    />

                    <h3 className="font-bold text-sm text-zinc-800 mt-6 mb-2">📝 Type: text</h3>
                    <p className="text-xs text-zinc-500 mb-2">Sends a plain WhatsApp text message. Only requires <code className="font-mono">message</code>.</p>
                    <CodeBlock code={`{
  "id": "sendMessageNode-1",
  "type": "sendMessageNode",
  "position": { "x": 250, "y": 200 },
  "data": {
    "messageType": "text",
    "message": "Hello! Welcome to our course platform. How can I help you today?"
  }
}`} />

                    <h3 className="font-bold text-sm text-zinc-800 mt-6 mb-2">🔘 Type: interactive (Buttons)</h3>
                    <FieldTable
                        fields={[
                            { name: "buttons", type: "array", required: true, description: "Array of button objects. Maximum 3 buttons. Each button: { id: string, title: string (max 20 chars) }" },
                        ]}
                    />
                    <Alert type="info">
                        After a buttons message, always add a <strong>Wait for Reply</strong> node, then route to <strong>Condition</strong> nodes matching each button title exactly.
                    </Alert>
                    <CodeBlock code={`{
  "id": "sendMessageNode-2",
  "type": "sendMessageNode",
  "position": { "x": 250, "y": 300 },
  "data": {
    "messageType": "interactive",
    "message": "What are you looking for today?",
    "buttons": [
      { "id": "btn_1", "title": "Courses" },
      { "id": "btn_2", "title": "Pricing" },
      { "id": "btn_3", "title": "Support" }
    ]
  }
}`} />

                    <h3 className="font-bold text-sm text-zinc-800 mt-6 mb-2">📋 Type: list</h3>
                    <FieldTable
                        fields={[
                            { name: "listButtonText", type: "string", required: true, description: "Text for the button that opens the list menu. Max 20 characters. e.g. 'View Options'" },
                            { name: "listItems", type: "array", required: true, description: "Array of up to 10 items. Each item: { id: string, title: string (max 24 chars), description?: string (max 72 chars) }" },
                        ]}
                    />
                    <CodeBlock code={`{
  "id": "sendMessageNode-3",
  "type": "sendMessageNode",
  "position": { "x": 250, "y": 300 },
  "data": {
    "messageType": "list",
    "message": "Please select a course from our catalog:",
    "listButtonText": "View Courses",
    "listItems": [
      { "id": "item_1", "title": "IELTS Preparation", "description": "6-week intensive program" },
      { "id": "item_2", "title": "Spoken English", "description": "Daily practice sessions" },
      { "id": "item_3", "title": "Business English", "description": "For professionals" }
    ]
  }
}`} />

                    <h3 className="font-bold text-sm text-zinc-800 mt-6 mb-2">🖼️ Types: image / video / document</h3>
                    <FieldTable
                        fields={[
                            { name: "mediaUrl", type: "string (URL)", required: true, description: "Public HTTPS URL of the media file. Must be directly accessible (no auth). Images: jpg/png/webp. Video: mp4. Document: pdf/docx etc." },
                            { name: "message", type: "string", required: false, description: "Optional caption text shown under the media." },
                        ]}
                    />
                    <Alert type="warning">
                        The <code className="font-mono">mediaUrl</code> must be a <strong>publicly accessible URL</strong>. Private or signed URLs will fail. If <code className="font-mono">mediaUrl</code> is missing for a media node, the node is silently skipped.
                    </Alert>
                    <CodeBlock code={`// Image
{
  "id": "sendMessageNode-4",
  "type": "sendMessageNode",
  "position": { "x": 250, "y": 400 },
  "data": {
    "messageType": "image",
    "mediaUrl": "https://example.com/course-brochure.jpg",
    "message": "Here is our course brochure!"
  }
}

// Document (PDF)
{
  "id": "sendMessageNode-5",
  "type": "sendMessageNode",
  "position": { "x": 250, "y": 500 },
  "data": {
    "messageType": "document",
    "mediaUrl": "https://example.com/syllabus.pdf",
    "message": "Download our full syllabus."
  }
}`} />
                </Section>

                {/* ── Wait Reply Node ───────────────────────────────────────── */}
                <Section
                    id="waitReply"
                    icon={<Clock className="w-4 h-4 text-amber-600" />}
                    color="bg-amber-100"
                    title="Wait for Reply Node"
                    badge="waitReplyNode"
                >
                    <p className="text-sm text-zinc-600 leading-relaxed mt-4">
                        Pauses the flow execution and waits for the contact to send their next message. The flow resumes only when the user replies.
                    </p>
                    <FieldTable
                        fields={[
                            { name: "variableName", type: "string", required: false, description: "If set, the user's reply text will be saved into the session state under this key. Can then be injected into later nodes using {{variableName}} syntax. e.g. 'user_name'" },
                        ]}
                    />
                    <Alert type="tip">
                        Always place a <strong>Wait for Reply</strong> node between a <strong>Send Message (buttons/list)</strong> node and the <strong>Condition</strong> nodes that branch on user selection.
                        <br /><br />
                        If <code className="font-mono">variableName</code> is set, the reply is also stored and can be used in later nodes via <code className="font-mono">{"{{variableName}}"}</code>.
                    </Alert>
                    <CodeBlock code={`// Wait and throw away the reply (used for branching only)
{
  "id": "waitReplyNode-1",
  "type": "waitReplyNode",
  "position": { "x": 250, "y": 400 },
  "data": {}
}

// Wait and capture the reply into a variable
{
  "id": "waitReplyNode-2",
  "type": "waitReplyNode",
  "position": { "x": 250, "y": 400 },
  "data": {
    "variableName": "user_name"
  }
}`} />
                </Section>

                {/* ── Condition Node ────────────────────────────────────────── */}
                <Section
                    id="condition"
                    icon={<Settings2 className="w-4 h-4 text-pink-600" />}
                    color="bg-pink-100"
                    title="Condition Node"
                    badge="conditionNode"
                >
                    <p className="text-sm text-zinc-600 leading-relaxed mt-4">
                        Evaluates the last user reply against a set of keywords. Routes to <strong>TRUE</strong> or <strong>FALSE</strong> branch depending on whether the reply matches.
                    </p>
                    <FieldTable
                        fields={[
                            { name: "condition", type: "string", required: true, description: "Comma-separated list of values to match against the last user reply. Case-insensitive. Partial match is supported. e.g. 'yes, 1, agree, ok'" },
                        ]}
                    />
                    <Alert type="info">
                        The Condition node has <strong>two output handles</strong>: <code className="font-mono font-bold text-emerald-700">true</code> and <code className="font-mono font-bold text-red-600">false</code>. In the <code className="font-mono">edges</code> array, use <code className="font-mono">sourceHandle: "true"</code> or <code className="font-mono">sourceHandle: "false"</code> to route each branch to its next node.
                    </Alert>
                    <CodeBlock code={`{
  "id": "conditionNode-1",
  "type": "conditionNode",
  "position": { "x": 250, "y": 600 },
  "data": {
    "condition": "courses, 1, ielts, english"
  }
}

// Matching edges (see the Edges section for full schema):
{ "source": "conditionNode-1", "sourceHandle": "true",  "target": "sendMessageNode-courses" },
{ "source": "conditionNode-1", "sourceHandle": "false", "target": "sendMessageNode-fallback" }`} />
                </Section>

                {/* ── Update Contact Node ───────────────────────────────────── */}
                <Section
                    id="updateContact"
                    icon={<Database className="w-4 h-4 text-purple-600" />}
                    color="bg-purple-100"
                    title="Update Contact Node"
                    badge="updateContactNode"
                >
                    <p className="text-sm text-zinc-600 leading-relaxed mt-4">
                        Writes data to the contact record in the CRM. Supports both standard fields and custom fields. This node executes instantly and does not pause the flow.
                    </p>
                    <FieldTable
                        fields={[
                            { name: "field", type: "string", required: true, description: "The CRM field to update. Standard fields: 'name', 'email', 'city', 'company', 'website', 'notes'. Custom fields: use 'custom_<key>' prefix, e.g. 'custom_course_interest'" },
                            { name: "value", type: "string", required: true, description: "The value to write. Can be a static string or use {{variable}} interpolation to inject a value captured by a Wait for Reply node earlier in the flow." },
                        ]}
                    />
                    <Alert type="tip">
                        The contact is automatically <strong>upserted</strong> — if no contact exists for the phone number, a new one is created. The <code className="font-mono">source</code> field on the contact is automatically set to <strong>"Chatbot"</strong>.
                    </Alert>
                    <CodeBlock code={`// Save a static value
{
  "id": "updateContactNode-1",
  "type": "updateContactNode",
  "position": { "x": 250, "y": 700 },
  "data": {
    "field": "city",
    "value": "Mumbai"
  }
}

// Save a variable captured by a waitReplyNode
{
  "id": "updateContactNode-2",
  "type": "updateContactNode",
  "position": { "x": 250, "y": 800 },
  "data": {
    "field": "name",
    "value": "{{user_name}}"
  }
}

// Save to a custom CRM field
{
  "id": "updateContactNode-3",
  "type": "updateContactNode",
  "position": { "x": 250, "y": 900 },
  "data": {
    "field": "custom_course_interest",
    "value": "{{selected_course}}"
  }
}`} />
                </Section>

                {/* ── Edges ─────────────────────────────────────────────────── */}
                <section id="edges" className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-base font-bold text-zinc-900 mb-1">Edges — Connecting Nodes</h2>
                    <p className="text-sm text-zinc-600 leading-relaxed mt-2 mb-4">
                        Edges define the connections between nodes. Each edge connects the <em>output handle</em> of a source node to the <em>input handle</em> of a target node.
                    </p>
                    <FieldTable
                        fields={[
                            { name: "id", type: "string", required: true, description: "Unique edge identifier. Convention: 'e-sourceId-targetId'" },
                            { name: "source", type: "string", required: true, description: "The id of the source node (where the connection starts)" },
                            { name: "target", type: "string", required: true, description: "The id of the target node (where the connection ends)" },
                            { name: "sourceHandle", type: "string", required: false, description: "Required only for conditionNode. Must be 'true' or 'false'. For all other nodes, omit this field (they have a single default output handle 'a')." },
                            { name: "animated", type: "boolean", required: false, description: "Visual only. Set to true to animate the edge line in the canvas. Does not affect execution." },
                            { name: "style", type: "object", required: false, description: "Visual only. CSS styles for the edge line. e.g. { stroke: '#6366f1', strokeWidth: 2 }" },
                        ]}
                    />
                    <CodeBlock code={`// Standard edge (non-condition nodes)
{
  "id": "e-trigger-1-send-1",
  "source": "trigger-1",
  "target": "sendMessageNode-1",
  "animated": true,
  "style": { "stroke": "#6366f1", "strokeWidth": 2 }
}

// Condition TRUE branch
{
  "id": "e-cond-1-send-yes",
  "source": "conditionNode-1",
  "sourceHandle": "true",
  "target": "sendMessageNode-yes"
}

// Condition FALSE branch
{
  "id": "e-cond-1-send-no",
  "source": "conditionNode-1",
  "sourceHandle": "false",
  "target": "sendMessageNode-no"
}`} />
                </section>

                {/* ── Variables ─────────────────────────────────────────────── */}
                <section id="variables" className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-base font-bold text-zinc-900 mb-1">Variable Interpolation</h2>
                    <p className="text-sm text-zinc-600 leading-relaxed mt-2">
                        You can use <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-purple-600 font-mono text-xs font-bold">{`{{variableName}}`}</code> syntax in <code className="font-mono text-xs">message</code> and <code className="font-mono text-xs">value</code> fields to inject values captured by{" "}
                        <strong>Wait for Reply</strong> nodes.
                    </p>
                    <CodeBlock code={`// Step 1: Ask the user their name
{ "type": "sendMessageNode", "data": { "messageType": "text", "message": "What is your name?" } }

// Step 2: Capture the reply into a variable called "user_name"  
{ "type": "waitReplyNode", "data": { "variableName": "user_name" } }

// Step 3: Use the variable in the next message
{ "type": "sendMessageNode", "data": { "messageType": "text", "message": "Nice to meet you, {{user_name}}! 👋" } }

// Step 4: Save to CRM
{ "type": "updateContactNode", "data": { "field": "name", "value": "{{user_name}}" } }`} />
                    <Alert type="info">
                        Variables are stored in the session state for the duration of the conversation. Multiple variables can be captured across multiple <code className="font-mono">waitReplyNode</code> steps in the same flow.
                    </Alert>
                </section>

                {/* ── Full Example ──────────────────────────────────────────── */}
                <section id="example" className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-base font-bold text-zinc-900 mb-1">Complete Example Flow</h2>
                    <p className="text-sm text-zinc-600 leading-relaxed mt-2 mb-1">
                        A complete "Lead Capture" flow: triggered by keyword → asks name → saves to CRM → asks interest → branches to course-specific replies.
                    </p>
                    <div className="text-xs text-zinc-500 mb-4 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-medium">Trigger →</span>
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-medium">Send Message →</span>
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-medium">Wait Reply →</span>
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-medium">Update CRM →</span>
                        <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-md font-medium">Condition →</span>
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-medium">Send Message</span>
                    </div>
                    <CodeBlock code={FULL_EXAMPLE_JSON} />
                </section>

                {/* Footer */}
                <div className="text-center py-8 text-xs text-zinc-400">
                    Flow JSON Reference • Chatbot Builder Documentation
                </div>
            </div>
        </div>
    );
}
