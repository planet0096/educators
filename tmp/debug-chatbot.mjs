/**
 * Chatbot Engine Diagnostic Script
 * Usage: node /tmp/debug-chatbot.mjs
 *
 * Connects directly to MongoDB, finds the e2@mail.com educator,
 * locates the "Testing 2" flow, and simulates the full chatbot engine
 * execution for the message "update profile".
 */

import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://gurdarwin280:Ecommerce123@cluster0.nbq6c.mongodb.net/educators?appName=Cluster0";
const TEST_EMAIL  = "e2@mail.com";
const FLOW_NAME   = "Testing 2";
const TEST_MSG    = "update profile";

// ── Inline Schema Definitions ────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({ email: String }, { strict: false });
const User = mongoose.models.User || mongoose.model("User", UserSchema);

const AutomationFlowSchema = new mongoose.Schema({
    educatorId:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name:        String,
    isActive:    Boolean,
    source:      String,
    triggerType: String,
    keywords:    [String],
    flowData:    mongoose.Schema.Types.Mixed,
}, { timestamps: true });
const AutomationFlow = mongoose.models.AutomationFlow || mongoose.model("AutomationFlow", AutomationFlowSchema);

const AutomationSessionSchema = new mongoose.Schema({
    educatorId:   mongoose.Schema.Types.ObjectId,
    contactPhone: String,
    flowId:       mongoose.Schema.Types.ObjectId,
    currentNodeId: String,
    state:        mongoose.Schema.Types.Mixed,
    status:       String,
    engineLocked: Boolean,
    lockedAt:     Date,
}, { timestamps: true });
const AutomationSession = mongoose.models.AutomationSession || mongoose.model("AutomationSession", AutomationSessionSchema);

const WhatsAppConfigSchema = new mongoose.Schema({
    user:          { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    phoneNumberId: String,
    accessToken:   String,
}, { strict: false });
const WhatsAppConfig = mongoose.models.WhatsAppConfig || mongoose.model("WhatsAppConfig", WhatsAppConfigSchema);

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(label, val) {
    console.log(`\n🔍 ${label}:`);
    if (typeof val === "object") {
        console.log(JSON.stringify(val, null, 2));
    } else {
        console.log(val);
    }
}

function sep(title) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`  ${title}`);
    console.log("─".repeat(60));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("✅ Connected\n");

    // 1. Find educator
    sep("1. EDUCATOR LOOKUP");
    const user = await User.findOne({ email: TEST_EMAIL });
    if (!user) {
        console.error(`❌ No user found with email: ${TEST_EMAIL}`);
        process.exit(1);
    }
    log("User found", { _id: user._id.toString(), email: user.email });

    const educatorId = user._id;

    // 2. WhatsApp Config
    sep("2. WHATSAPP CONFIG");
    const config = await WhatsAppConfig.findOne({ user: educatorId });
    if (!config) {
        console.error("❌ No WhatsAppConfig found for this educator");
    } else {
        log("WhatsApp config", {
            phoneNumberId: config.phoneNumberId || "⚠️  MISSING",
            accessToken:   config.accessToken   ? "✅ present (hidden)" : "❌ MISSING",
        });
    }

    // 3. All flows for this educator
    sep("3. ALL AUTOMATION FLOWS");
    const allFlows = await AutomationFlow.find({ educatorId });
    if (allFlows.length === 0) {
        console.error("❌ No flows found for this educator at all!");
    } else {
        console.log(`Found ${allFlows.length} total flow(s):`);
        allFlows.forEach(f => {
            const nodeCount = f.flowData?.nodes?.length ?? 0;
            const edgeCount = f.flowData?.edges?.length ?? 0;
            const flag = f.isActive ? "✅ ACTIVE" : "⏸  inactive";
            const srcFlag = f.source === "calcom" ? "⚠️  CAL.COM" : "🤖 chatbot";
            console.log(`  [${flag}] [${srcFlag}] "${f.name}" | trigger: ${f.triggerType} | keywords: [${(f.keywords||[]).join(", ")}] | ${nodeCount} nodes, ${edgeCount} edges`);
        });
    }

    // 4. Target flow deep dive
    sep(`4. TARGET FLOW - "${FLOW_NAME}"`);
    const targetFlow = await AutomationFlow.findOne({ educatorId, name: FLOW_NAME });
    if (!targetFlow) {
        console.error(`❌ Flow named "${FLOW_NAME}" not found!`);
    } else {
        log("Flow metadata", {
            _id:         targetFlow._id.toString(),
            name:        targetFlow.name,
            isActive:    targetFlow.isActive,
            source:      targetFlow.source ?? "(not set — legacy)",
            triggerType: targetFlow.triggerType,
            keywords:    targetFlow.keywords,
        });

        const nodes = targetFlow.flowData?.nodes ?? [];
        const edges = targetFlow.flowData?.edges ?? [];

        console.log(`\nNodes (${nodes.length}):`);
        nodes.forEach(n => {
            const data = { ...n.data };
            if (data.message && data.message.length > 60) data.message = data.message.substring(0, 60) + "…";
            console.log(`  [${n.type}] id=${n.id}`, JSON.stringify(data));
        });

        console.log(`\nEdges (${edges.length}):`);
        edges.forEach(e => {
            console.log(`  ${e.source} → ${e.target}  (handle: ${e.sourceHandle ?? "default"})`);
        });

        if (nodes.length === 0) {
            console.error("\n❌ FLOW HAS NO NODES — this is the problem! Build out the flow in the editor.");
        }
        if (edges.length === 0 && nodes.length > 1) {
            console.error("\n❌ FLOW HAS NODES BUT NO EDGES — nodes are not connected!");
        }
    }

    // 5. Simulate keyword matching (no DB writes)
    sep(`5. SIMULATING ENGINE - message: "${TEST_MSG}"`);
    const textLower = TEST_MSG.toLowerCase().trim();

    // Query exactly as the (now-fixed) chatbot engine does
    const activeFlows = await AutomationFlow.find({
        educatorId,
        isActive: true,
        source: { $nin: ["calcom"] }
    });
    console.log(`Active chatbot flows returned by fixed query: ${activeFlows.length}`);

    let matchingFlow = null;
    for (const flow of activeFlows) {
        if (flow.triggerType === "keyword" && flow.keywords) {
            let keywordList = Array.isArray(flow.keywords)
                ? flow.keywords
                : flow.keywords.split(",").map(k => k.trim());
            const isMatch = keywordList.some(k => textLower.includes(k.toLowerCase().trim()));
            if (isMatch) {
                matchingFlow = flow;
                console.log(`  ✅ Keyword match → "${flow.name}"`);
                break;
            } else {
                console.log(`  ✗ No keyword match in "${flow.name}" [${keywordList.join(", ")}]`);
            }
        }
    }

    if (!matchingFlow) {
        matchingFlow = activeFlows.find(f => f.triggerType === "catch_all");
        if (matchingFlow) console.log(`  ✅ Catch-all match → "${matchingFlow.name}"`);
    }

    if (!matchingFlow) {
        console.error("\n❌ NO MATCHING FLOW found for the message. Possible causes:");
        console.error("   • No active chatbot flow");
        console.error("   • Keyword doesn't match (check spelling/case)");
        console.error("   • Flow source is 'calcom' and got excluded");
    } else {
        const nodes = matchingFlow.flowData?.nodes ?? [];
        const triggerNode = nodes.find(n => n.type === "triggerNode");
        const edges = matchingFlow.flowData?.edges ?? [];

        if (!triggerNode) {
            console.error("\n❌ MATCHED FLOW HAS NO TRIGGER NODE — flow is broken");
        } else {
            console.log(`\n✅ Trigger node found: id=${triggerNode.id}`);
            const outgoing = edges.filter(e => e.source === triggerNode.id);
            if (outgoing.length === 0) {
                console.error("❌ TRIGGER NODE HAS NO OUTGOING EDGES — nothing will execute after the trigger!");
            } else {
                console.log(`✅ Trigger node connects to ${outgoing.length} next node(s)`);
                outgoing.forEach(e => {
                    const target = nodes.find(n => n.id === e.target);
                    console.log(`   → [${target?.type ?? "unknown"}] id=${e.target}`);
                });
            }
        }
    }

    // 6. Existing sessions
    sep("6. EXISTING SESSIONS (all statuses)");
    const sessions = await AutomationSession.find({ educatorId }).sort({ updatedAt: -1 }).limit(10);
    if (sessions.length === 0) {
        console.log("No sessions found.");
    } else {
        sessions.forEach(s => {
            const locked = s.engineLocked ? " 🔒 LOCKED" : "";
            console.log(`  [${s.status}]${locked} phone=${s.contactPhone} node=${s.currentNodeId ?? "—"} updated=${s.updatedAt?.toISOString()}`);
        });
    }

    // 7. Check for stuck LOCKED sessions
    sep("7. STUCK LOCKS CHECK");
    const lockedSessions = await AutomationSession.find({ educatorId, engineLocked: true });
    if (lockedSessions.length > 0) {
        console.error(`❌ Found ${lockedSessions.length} STUCK LOCKED session(s)! This blocks all new messages for those contacts.`);
        lockedSessions.forEach(s => console.error(`   phone=${s.contactPhone} lockedAt=${s.lockedAt}`));
        console.log("\n⚠️  Run this to clear stuck locks:");
        console.log(`   db.automationsessions.updateMany({ educatorId: ObjectId("${educatorId}"), engineLocked: true }, { $unset: { engineLocked: 1, lockedAt: 1 } })`);
    } else {
        console.log("✅ No stuck locks found.");
    }

    sep("DIAGNOSIS COMPLETE");
    await mongoose.disconnect();
}

main().catch(err => {
    console.error("Fatal Error:", err);
    mongoose.disconnect();
    process.exit(1);
});
