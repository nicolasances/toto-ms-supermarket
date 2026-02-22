import { AgentConversationMessage } from "../model/AgentConversationMessage";
import { GaleAgent } from "./GaleAgent";

export class GaleConversationalAgent extends GaleAgent {

    /**
     * Allows the Agent to publish a message to the conversation. 
     * 
     * This can be used by the Agent to give back feedback to the user while processing the message, for example to let the user know that we have received the message and we are working on it, or to ask for clarifications, etc.
     * 
     * @param message 
     */
    protected async publishMessage(message: AgentConversationMessage) {
        throw new Error("Not implemented");
    }

}