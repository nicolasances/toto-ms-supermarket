import { ControllerConfig } from "Config";
import { vertexAI } from "@genkit-ai/google-genai";
import { genkit, z } from "genkit";
import { v4 as uuid } from "uuid";
import { AgentConversationMessage, GaleConversationalAgent, AgentManifest, newTotoServiceToken, TotoMessage, MessageDestination } from "totoms";
import { AgenticLoop } from "@nicolas.ances/toten";
import { createTools } from "./tools/SuppieTools";

export class SuppieAgent extends GaleConversationalAgent {

    getManifest(): AgentManifest {
        return {
            agentType: "conversational",
            agentId: "suppie",
            humanFriendlyName: "Suppie",
        }
    }

    async onMessage(message: AgentConversationMessage): Promise<AgentConversationMessage> {

        const config = this.config as ControllerConfig;
        const streamId = uuid();
        let streamMessageIndex = 1;

        const ai = genkit({
            plugins: [vertexAI({ location: "europe-west1" })],
            model: vertexAI.model('gemini-2.0-flash'),
            // plugins: [awsBedrock({ region: "eu-north-1" })],
            // model: "amazon.nova-pro",
        });

        const tools = createTools(ai, config, this.messageBus, this.cid);

        const result = await new AgenticLoop({
            ai,
            tools,
            correlationId: this.cid,
            additionalInstructions: `
                If the user is naming items to add or remove from the list follow THESE VERY IMPORTANT CONSIDERATIONS; 
                    - The list could come from a speech-to-text transcription and might contain errors. Some items might have been pronounced in Danish or Italian and the translation might be wrong. 
                    - BEFORE adding an item to the list, if the item could be a Danish mispelling, check if you find it in the common supermarket items list. If you find something similar, use that one. 
            `,
            identity: `You are Suppie, an assistant to help users manage their supermarket list.`,
            personality: `You are concise but friendly. You always try to keep answers short and to the point.`
        }).loop({ goal: message.message });

        this.publishMessage({
            conversationId: message.conversationId,
            messageId: message.messageId,
            agentId: message.agentId,
            message: result.finalAnswer,
            actor: "agent",
            stream: {
                streamId: streamId,
                sequenceNumber: streamMessageIndex++,
                last: true
            }
        })

        return {
            conversationId: message.conversationId,
            messageId: message.messageId,
            agentId: message.agentId,
            message: result.finalAnswer,
            actor: "agent"
        }
    }
}
