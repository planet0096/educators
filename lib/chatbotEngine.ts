import AutomationFlow from "@/models/AutomationFlow";
import AutomationSession from "@/models/AutomationSession";
import { IWhatsAppConfig } from "@/models/WhatsAppConfig";

export const processIncomingMessage = async (
    educatorId: string,
    contactPhone: string,
    messageText: string,
    whatsappConfig: IWhatsAppConfig
) => {
    try {
        const textLower = messageText.toLowerCase().trim();

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
                    keywordList = flow.keywords.split(",").map(k => k.trim());
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
            console.log(`[ChatbotEngine] No matching flow found for text: "${messageText}"`);
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

        // Find next edge
        const outgoingEdge = edges.find((e: any) => e.source === currentNode.id);
        if (!outgoingEdge) {
            session.status = "completed";
            await session.save();
            return;
        }

        previousNode = currentNode;
        currentNode = nodes.find((n: any) => n.id === outgoingEdge.target);
    }

    // Step 2: Loop through nodes until we hit a Wait, or the end of the flow
    let isWaitingForReply = false;

    try {
        while (currentNode) {
            console.log(`[ChatbotEngine] Executing node: ${currentNode.id} (${currentNode.type})`);
            if (currentNode.type === "sendMessageNode") {
                let messageText = currentNode.data?.message || "";

                // Replace variables {{varName}} with session state
                for (const [key, value] of Object.entries(session.state)) {
                    messageText = messageText.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
                }

                if (messageText) {
                    await sendWhatsAppText(
                        whatsappConfig.phoneNumberId,
                        whatsappConfig.accessToken,
                        session.contactPhone,
                        messageText
                    );
                }

                const outgoingEdge = edges.find((e: any) => e.source === currentNode.id);
                if (!outgoingEdge) {
                    currentNode = null;
                    session.status = "completed";
                } else {
                    currentNode = nodes.find((n: any) => n.id === outgoingEdge.target);
                }

            } else if (currentNode.type === "waitReplyNode") {
                // Stop executing, wait for next real user message
                isWaitingForReply = true;
                session.currentNodeId = currentNode.id;
                await session.save();
                return; // EXIT LOOP

            } else if (currentNode.type === "conditionNode") {
                const conditionStr = (currentNode.data?.condition || "").toLowerCase().trim();
                const isMatch = incomingMessage === conditionStr || incomingMessage.includes(conditionStr);

                // Figure out which handle to follow
                const sourceHandle = isMatch ? "true" : "false";
                const outgoingEdge = edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === sourceHandle);

                if (!outgoingEdge) {
                    currentNode = null;
                    session.status = "completed";
                } else {
                    currentNode = nodes.find((n: any) => n.id === outgoingEdge.target);
                }

            } else if (currentNode.type === "triggerNode") {
                // Just move to the next node
                const outgoingEdge = edges.find((e: any) => e.source === currentNode.id);
                if (!outgoingEdge) {
                    currentNode = null;
                    session.status = "completed";
                } else {
                    currentNode = nodes.find((n: any) => n.id === outgoingEdge.target);
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

    try {
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
        }
    } catch (err) {
        console.error(`[ChatbotEngine] Fetch Error:`, err);
    }
}
