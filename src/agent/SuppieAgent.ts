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

        // 1. Get the names from the DB to give the AI an idea of the most common items picked by the user.
        // Instantiate the DB
        const db = await config.getMongoDb(config.getDBName());

        // Create the store
        const store = new ArchivedListStore(db, config);

        // Get the names (top 300)
        const names = await store.getDistinctItemNames(300);

        const ai = genkit({
            plugins: [vertexAI()],
            model: vertexAI.model('gemini-2.0-flash')
            // plugins: [awsBedrock({ region: "eu-north-1" })],
            // model: "amazon.nova-pro",
        });

        // 1. Intent recognition
        const intentSchema = z.object({
            intent: z.string().describe("The intent (among those supported) that best matches the user's message."),
            feedback: z.string().describe("A few words (short) to the the user that their intent has been understood and that you'll take care of the task.")
        })
        const intent = await ai.generate({
            system: `
                You are an AI Assistant for an App that manages a user's groceries shopping list. 
                Your responsibility is, given a user message, to understand its intent. 
            `,
            prompt: `
                You have received the following message from the user: 
                ${message.message}

                ## Your task: 
                Select, ONLY among the following itents, the intent that is the most appropriate for this user message. These are THE ONLY intents that you support:
                - addItems - the user wants to add items to his or her shopping list
                - removeItems - the user wants to remove items from his or her shopping list

                If the user's message does not fit one of these intents, return "noSupportedItent". 

                Also, generate a sentence for the user that makes him or her understand that you have understood their intent. 
            `,
            output: {
                schema: intentSchema
            }
        })

        this.publishMessage({
            conversationId: message.conversationId,
            messageId: uuid(),
            agentId: message.agentId,
            message: intent.output?.feedback || "Sorry, I did not understand.",
            actor: "agent",
            stream: { streamId, sequenceNumber: streamMessageIndex++, last: false }
        })

        if (intent.output?.intent === "addItems") {

            // Process the intent 
            const addItemIntentResult = await new AddItemIntent(config, ai).processIntent(message);

            this.publishMessage({
                conversationId: message.conversationId,
                messageId: uuid(),
                agentId: message.agentId,
                message: (await ai.generate({
                    prompt: `
                        You have just added ${addItemIntentResult.items.length} items to the user's shopping list.
                        Generate a nice short sentence to let the user know that you have added the items to the shopping list. If no items were added, tell the user so. 
                    `,
                    output: { schema: z.object({ confirmationMessage: z.string() }) }
                })).output?.confirmationMessage || "I have added the items to the shopping list for you!",
                actor: "agent",
                stream: { streamId, sequenceNumber: streamMessageIndex++, last: false }
            })

            // TODO: Add the items to the shopping list in the DB
            const items: ListItem[] = addItemIntentResult.items.map(itemName => (new ListItem(itemName)));

            const addItemProcess = new AddItemsToListProcess(newTotoServiceToken(config), config, this.cid!, items, async (itemId, itemToPublish, authToken) => {
                const timestamp = moment().tz('Europe/Rome').format('YYYY.MM.DD HH:mm:ss');
                const message: TotoMessage = {
                    timestamp: timestamp,
                    cid: this.cid!,
                    id: itemId,
                    type: "itemAdded",
                    msg: `Item [${itemToPublish.id}] added to the Supermarket List`,
                    data: { item: itemToPublish, authToken: authToken }
                };

                await this.messageBus.publishMessage(new MessageDestination({ topic: "supermarket" }), message)
            });

            await addItemProcess.do(db);

            return {
                conversationId: message.conversationId,
                messageId: message.messageId,
                agentId: message.agentId,
                message: "Done. Added the items to the shopping list.",
                actor: "agent"
            }
        }
        else if (intent.output?.intent === "removeItems") {
            throw new Error("Not implemented yet");
        }

        return {
            conversationId: message.conversationId,
            messageId: message.messageId,
            agentId: message.agentId,
            message: "Sorry I cannot help you on this yet.",
            actor: "agent"
        }
    }
}