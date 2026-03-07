import AutomationFlow from "@/models/AutomationFlow";
import AutomationSession from "@/models/AutomationSession";
import { IWhatsAppConfig } from "@/models/WhatsAppConfig";
import mongoose from "mongoose";

// Acquire a mutually exclusive lock on the specific contact's session to prevent race conditions
// when the user fires two rapid messages at the webhook simultaneously.
async function acquireLock(educatorId: string, contactPhone: string, maxWaitMs = 5000): Promise<boolean> {
    const lockKey = `${educatorId}_${contactPhone}_lock`;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
        // Try to atomically set an 'engineLocked' flag on the session (or create a phantom session if none exists)
        const session = await AutomationSession.findOneAndUpdate(
            { educatorId, contactPhone, engineLocked: { $ne: true } },
            { $set: { engineLocked: true, lockedAt: new Date() } },
            { new: true, upsert: false }
        );

        if (session) return true; // Successfully acquired lock on existing session

        // If no session exists at all, we create a fresh one *with* the lock enabled atomically
        try {
            await AutomationSession.create({
                educatorId,
                contactPhone,
                status: 'completed', // Not currently mid-flow
                engineLocked: true,
                lockedAt: new Date(),
                state: {},
            });
            return true;
        } catch (err: any) {
            if (err.code !== 11000) throw err; // Ignore duplicate key errors if someone beat us to creating it
        }

        // Wait 250ms and try again
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    return false; // Failed to acquire lock within timeout
}

async function releaseLock(educatorId: string, contactPhone: string) {
    await AutomationSession.findOneAndUpdate(
        { educatorId, contactPhone },
        { $unset: { engineLocked: 1, lockedAt: 1 } }
    );
}

export async function processIncomingMessage(
    educatorId: string,
    contactPhone: string,
    incomingMessage: string,
    whatsappConfig: any
) {
    // 1. Enforce Concurrency Lock
    const locked = await acquireLock(educatorId, contactPhone);
    if (!locked) {
        console.error(`[ChatbotEngine] Mutex Lock timeout for ${contactPhone}. Force releasing and retrying...`);
        // If we timeout, it means a previous process crashed without releasing the lock. 
        // We throw an Error to tell QStash/Inngest to backoff and retry this message later.
        await releaseLock(educatorId, contactPhone);
        throw new Error("Concurrency lock timeout -> requeueing message");
    }

    try {
        console.log(`\n================================`);
        console.log(`[ChatbotEngine] START - Contact: ${contactPhone} | Message: "${incomingMessage}"`);

        const textLower = incomingMessage.toLowerCase().trim();

        // 1. Check if there is an active session for this contact
        let activeSession = await AutomationSession.findOne({
            educatorId,
            contactPhone,
            status: "active"
        });

        if (activeSession) {
            // Resume the flow
            console.log(`[ChatbotEngine] Resuming session for ${contactPhone}`);
            await executeFlowSession(activeSession, textLower, whatsappConfig);
            console.log(`[ChatbotEngine] END - Session is now ${activeSession.status}`);
            console.log(`================================\n`);
            return;
        }

        // 2. Check for trigger matches on active flows
        const activeFlows = await AutomationFlow.find({
            educatorId,
            isActive: true
        });

        if (!activeFlows || activeFlows.length === 0) {
            return; // No active automations
        }

        // Prioritize Keyword matches over Catch-All
        let matchingFlow = null;

        for (const flow of activeFlows) {
            if (flow.triggerType === "keyword" && flow.keywords) {
                // Determine if keywords is an array or a single comma-separated string
                let keywordList: string[] = [];
                if (Array.isArray(flow.keywords)) {
                    keywordList = flow.keywords;
                } else if (typeof flow.keywords === "string") {
                    keywordList = flow.keywords.split(",").map((k: string) => k.trim());
                }

                if (keywordList.length > 0) {
                    // Check if message contains keyword
                    const isMatch = keywordList.some((k: string) => textLower.includes(k.toLowerCase().trim()));
                    if (isMatch) {
                        matchingFlow = flow;
                        break;
                    }
                }
            }
        }

        // Try Catch All if no keyword match
        if (!matchingFlow) {
            matchingFlow = activeFlows.find((f: any) => f.triggerType === "catch_all");
        }

        if (!matchingFlow) {
            console.log(`[ChatbotEngine] No matching flow found for text: "${incomingMessage}"`);
            return; // No matching flow
        }

        console.log(`[ChatbotEngine] Starting new flow "${matchingFlow.name}" for ${contactPhone}`);

        // Find the trigger node in the flow
        const nodes = matchingFlow.flowData?.nodes || [];
        const triggerNode = nodes.find((n: any) => n.type === "triggerNode");

        if (!triggerNode) {
            console.error(`[ChatbotEngine] Flow ${matchingFlow.name} has no trigger node`);
            return;
        }

        // Create new session
        const newSession = await AutomationSession.create({
            educatorId,
            contactPhone,
            flowId: matchingFlow._id,
            currentNodeId: triggerNode.id,
            state: {},
            status: "active"
        });

        // Start Execution
        await executeFlowSession(newSession, textLower, whatsappConfig);

    } catch (error) {
        console.error("[ChatbotEngine Error]", error);
    }
};


async function executeFlowSession(
    session: any,
    incomingMessage: string,
    whatsappConfig: IWhatsAppConfig
) {
    // Determine the next step based on current node
    const flow = await AutomationFlow.findById(session.flowId);
    if (!flow || !flow.isActive) {
        session.status = "failed";
        await session.save();
        return;
    }

    const nodes = flow.flowData?.nodes || [];
    const edges = flow.flowData?.edges || [];

    let currentNode = nodes.find((n: any) => n.id === session.currentNodeId);
    let previousNode = null;

    if (!currentNode) {
        session.status = "failed";
        await session.save();
        return;
    }

    // Step 1: If we are currently "Waiting for Reply", evaluate it and move to next node
    if (currentNode.type === "waitReplyNode") {
        // Save reply to variable if specified
        if (currentNode.data?.variableName) {
            session.state[currentNode.data.variableName] = incomingMessage;
            session.markModified('state');
        }

        // Find next edge. If branching to multiple conditions, evaluate which one matches.
        const outgoingEdges = edges.filter((e: any) => e.source === currentNode.id);
        let selectedEdge = outgoingEdges.length > 0 ? outgoingEdges[0] : null;

        if (outgoingEdges.length > 1) {
            for (const edge of outgoingEdges) {
                const targetNode = nodes.find((n: any) => n.id === edge.target);
                if (targetNode && targetNode.type === "conditionNode") {
                    const conditions = (targetNode.data?.condition || "").split(",").map((c: string) => c.toLowerCase().trim()).filter(Boolean);
                    if (conditions.some((c: string) => incomingMessage === c || incomingMessage.includes(c))) {
                        selectedEdge = edge;
                        break;
                    }
                }
            }
        }

        if (!selectedEdge) {
            session.status = "completed";
            await session.save();
            return;
        }

        previousNode = currentNode;
        currentNode = nodes.find((n: any) => n.id === selectedEdge.target);
    }

    // Helper function to pick next node for generic nodes (handles parallel condition branching)
    const getNextGenericNode = (nodeId: string, currentMessage: string) => {
        const outgoingEdges = edges.filter((e: any) => e.source === nodeId);
        if (outgoingEdges.length === 0) return null;
        if (outgoingEdges.length === 1) return nodes.find((n: any) => n.id === outgoingEdges[0].target);

        // Multiple edges: try to route to a matching condition node
        for (const edge of outgoingEdges) {
            const targetNode = nodes.find((n: any) => n.id === edge.target);
            if (targetNode && targetNode.type === "conditionNode") {
                const conditions = (targetNode.data?.condition || "").split(",").map((c: string) => c.toLowerCase().trim()).filter(Boolean);
                if (conditions.some((c: string) => currentMessage === c || currentMessage.includes(c))) {
                    return targetNode;
                }
            }
        }

        // Fallback to the first target if no condition matches
        return nodes.find((n: any) => n.id === outgoingEdges[0].target);
    };

    // Step 2: Loop through nodes until we hit a Wait, or the end of the flow
    let isWaitingForReply = false;

    try {
        while (currentNode) {
            console.log(`[ChatbotEngine] Executing node: ${currentNode.id} (${currentNode.type})`);
            if (currentNode.type === "sendMessageNode") {
                const messageType = currentNode.data?.messageType || "text";
                const buttons = (currentNode.data?.buttons as any[]) || [];
                let messageText = currentNode.data?.message || "";

                // Replace variables {{varName}} with session state
                for (const [key, value] of Object.entries(session.state)) {
                    messageText = messageText.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
                }

                if (messageText) {
                    if (messageType === "interactive" && buttons.length > 0) {
                        await sendWhatsAppInteractive(
                            whatsappConfig.phoneNumberId,
                            whatsappConfig.accessToken,
                            session.contactPhone,
                            messageText,
                            buttons
                        );
                    } else {
                        await sendWhatsAppText(
                            whatsappConfig.phoneNumberId,
                            whatsappConfig.accessToken,
                            session.contactPhone,
                            messageText
                        );
                    }
                }

                const nextNode = getNextGenericNode(currentNode.id, incomingMessage);
                if (!nextNode) {
                    currentNode = null;
                    session.status = "completed";
                } else {
                    currentNode = nextNode;
                }

            } else if (currentNode.type === "waitReplyNode") {
                // Stop executing, wait for next real user message
                isWaitingForReply = true;
                session.currentNodeId = currentNode.id;
                await session.save();
                return; // EXIT LOOP

            } else if (currentNode.type === "conditionNode") {
                const conditions = (currentNode.data?.condition || "").split(",").map((c: string) => c.toLowerCase().trim()).filter(Boolean);
                const isMatch = conditions.some((c: string) => incomingMessage === c || incomingMessage.includes(c));

                // Figure out which handle to follow
                const sourceHandle = isMatch ? "true" : "false";
                const outgoingEdge = edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === sourceHandle);

                if (!outgoingEdge) {
                    currentNode = null;
                    session.status = "completed";
                } else {
                    currentNode = nodes.find((n: any) => n.id === outgoingEdge.target);
                }

            } else if (currentNode.type === "listMessageNode") {
                const items = (currentNode.data?.items as any[]) || [];
                const buttonLabel = (currentNode.data?.buttonLabel as string) || "View Options";
                const footer = (currentNode.data?.footer as string) || "";
                let messageText = (currentNode.data?.message as string) || "";

                // Replace variables {{varName}} with session state
                for (const [key, value] of Object.entries(session.state)) {
                    messageText = messageText.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
                }

                const validItems = items.filter((item: any) => item.title?.trim() !== "");

                if (messageText && validItems.length > 0) {
                    await sendWhatsAppList(
                        whatsappConfig.phoneNumberId,
                        whatsappConfig.accessToken,
                        session.contactPhone,
                        messageText,
                        footer,
                        buttonLabel,
                        validItems
                    );
                } else if (messageText) {
                    // Fallback to text if no items configured
                    await sendWhatsAppText(whatsappConfig.phoneNumberId, whatsappConfig.accessToken, session.contactPhone, messageText);
                }

                const nextNode = getNextGenericNode(currentNode.id, incomingMessage);
                if (!nextNode) {
                    currentNode = null;
                    session.status = "completed";
                } else {
                    currentNode = nextNode;
                }

            } else if (currentNode.type === "triggerNode") {
                // Just move to the next node
                const nextNode = getNextGenericNode(currentNode.id, incomingMessage);
                if (!nextNode) {
                    currentNode = null;
                    session.status = "completed";
                } else {
                    currentNode = nextNode;
                }
            } else {
                // Unknown node
                console.warn(`[ChatbotEngine] Unknown node type: ${currentNode.type}`);
                currentNode = null;
                session.status = "failed";
            }
        }
    } finally {
        // If we exit the loop and we are NOT explicitly waiting for a reply, 
        // the flow has naturally concluded (or errored out). Close the session.
        if (!isWaitingForReply) {
            session.status = "completed";
            await session.save();
        } else {
            // We ARE waiting for a reply. Make sure the session stays active.
            session.status = "active";
            await session.save();
        }
    }
}

async function sendWhatsAppText(phoneNumberId: string, accessToken: string, toPhone: string, text: string) {
    const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: toPhone,
            type: "text",
            text: { body: text }
        })
    });

    const data = await response.json();
    console.log(`[ChatbotEngine] WhatsApp API Response for ${toPhone}:`, data);

    if (!response.ok) {
        console.error(`[ChatbotEngine] WhatsApp API Error:`, data);
        // Throwing error here bubbles up to the QStash Consumer route, intentionally causing it to return 500.
        // QStash intercepts the 500 and will automatically retry this specific user message via exponential backoff.
        throw new Error(`Meta API Failed (Status ${response.status}): ${JSON.stringify(data.error)}`);
    }
}

async function sendWhatsAppInteractive(phoneNumberId: string, accessToken: string, toPhone: string, text: string, buttons: any[]) {
    const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    // Cap buttons to 3 (WhatsApp limit)
    const validButtons = buttons.slice(0, 3).filter(b => b.title && b.title.trim() !== "");
    if (validButtons.length === 0) return sendWhatsAppText(phoneNumberId, accessToken, toPhone, text);

    const interactivePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhone,
        type: "interactive",
        interactive: {
            type: "button",
            body: { text },
            action: {
                buttons: validButtons.map((btn, index) => ({
                    type: "reply",
                    reply: {
                        id: btn.id || `btn_${index}`,
                        title: btn.title.substring(0, 20) // API limit 20 chars
                    }
                }))
            }
        }
    };

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(interactivePayload)
    });

    const data = await response.json();
    console.log(`[ChatbotEngine] WhatsApp Interactive API Response for ${toPhone}:`, data);

    if (!response.ok) {
        console.error(`[ChatbotEngine] WhatsApp API Error:`, data);
        // Throwing error here bubbles up to the QStash Consumer route, intentionally causing it to return 500.
        // QStash intercepts the 500 and will automatically retry this specific user message via exponential backoff.
        throw new Error(`Meta Interactive API Failed (Status ${response.status}): ${JSON.stringify(data.error)}`);
    }
}

async function sendWhatsAppList(
    phoneNumberId: string,
    accessToken: string,
    toPhone: string,
    bodyText: string,
    footerText: string,
    buttonLabel: string,
    items: { title: string; description?: string }[]
) {
    const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    // WhatsApp List Messages must have at least 1 and at most 10 items in one or more sections
    const rows = items.slice(0, 10).map((item, index) => ({
        id: `list_item_${index}`,
        title: item.title.substring(0, 24),          // API limit: 24 chars
        description: (item.description || "").substring(0, 72) // API limit: 72 chars
    }));

    const listPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhone,
        type: "interactive",
        interactive: {
            type: "list",
            body: { text: bodyText },
            ...(footerText ? { footer: { text: footerText } } : {}),
            action: {
                button: buttonLabel.substring(0, 20), // API limit: 20 chars
                sections: [
                    {
                        title: "Options",
                        rows
                    }
                ]
            }
        }
    };

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(listPayload)
    });

    const data = await response.json();
    console.log(`[ChatbotEngine] WhatsApp List API Response for ${toPhone}:`, data);

    if (!response.ok) {
        console.error(`[ChatbotEngine] WhatsApp List API Error:`, data);
        throw new Error(`Meta List API Failed (Status ${response.status}): ${JSON.stringify(data.error)}`);
    }
}
