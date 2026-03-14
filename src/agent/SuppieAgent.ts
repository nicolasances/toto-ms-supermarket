import { ControllerConfig } from "Config";
import { vertexAI } from "@genkit-ai/google-genai";
import { genkit, z } from "genkit";
import { ArchivedListStore } from "store/ArchivedListStore";
import { v4 as uuid } from "uuid";
import { AgentConversationMessage, GaleConversationalAgent, AgentManifest, newTotoServiceToken, TotoMessage, MessageDestination } from "totoms";
import { AddItemIntent } from "./intents/AddItem";
import { AddItemsToListProcess } from "process/AddItemsToListProcess";
import { ListItem } from "model/ListItem";
import moment from "moment-timezone";
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
            plugins: [vertexAI()],
            model: vertexAI.model('gemini-2.0-flash')
            // plugins: [awsBedrock({ region: "eu-north-1" })],
            // model: "amazon.nova-pro",
        });

        const tools = createTools(ai, config, this.cid);

        const result = await new AgenticLoop({ ai, tools, correlationId: this.cid }).loop({ goal: message.message });

        return {
            conversationId: message.conversationId,
            messageId: message.messageId,
            agentId: message.agentId,
            message: result.finalAnswer, 
            actor: "agent"
        }
    }
}
