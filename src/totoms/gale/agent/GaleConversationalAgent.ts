import { Request } from "express";
import { AgentConversationMessage } from "../model/AgentConversationMessage";
import { GaleAgent } from "./GaleAgent";
import { UserContext } from "../../model/UserContext";
import { ValidationError } from "../../validation/Validator";

export abstract class GaleConversationalAgent extends GaleAgent<AgentConversationMessage, AgentConversationMessage> {

    /**
     * Allows the Agent to publish a message to the conversation. 
     * 
     * This can be used by the Agent to give back feedback to the user while processing the message, for example to let the user know that we have received the message and we are working on it, or to ask for clarifications, etc.
     * 
     * @param message 
     */
    protected async publishMessage(message: AgentConversationMessage) {
        // throw new Error("Not implemented");
    }

    /**
     * Handles an incoming message from the conversation.
     * This is the main method that the Agent needs to implement to handle the conversation.
     * 
     * It receives a message from the conversation and it should return a message to be sent back to the conversation (if needed).
     * 
     * IMPORTANT NOTE: 
     * The Agent can also use the publishMessage method to publish messages to the conversation without having to wait for a response, for example to give feedback to the user while processing the message.
     * 
     * @param message 
     */
    protected abstract onMessage(message: AgentConversationMessage): Promise<AgentConversationMessage>

    protected do(req: AgentConversationMessage, userContext?: UserContext): Promise<AgentConversationMessage> {
        return this.onMessage(req);
    }

    public parseRequest(req: Request): AgentConversationMessage {

        if (!req.body.conversationId) throw new ValidationError(400, "Missing conversationId");
        if (!req.body.messageId) throw new ValidationError(400, "Missing messageId");
        if (!req.body.agentId) throw new ValidationError(400, "Missing agentId");
        if (!req.body.actor) throw new ValidationError(400, "Missing actor");
        if (!req.body.message) throw new ValidationError(400, "Missing message");

        return {
            conversationId: req.body.conversationId,
            messageId: req.body.messageId,
            agentId: req.body.agentId,
            actor: req.body.actor,
            message: req.body.message,
            extras: req.body.extras
        }
        
    }

}