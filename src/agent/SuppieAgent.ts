import { ControllerConfig } from "Config";
import { vertexAI } from "@genkit-ai/google-genai";
import { genkit, z } from "genkit";
import { ArchivedListStore } from "store/ArchivedListStore";
import { v4 as uuid } from "uuid";
import { GaleConversationalAgent } from "../totoms/gale/agent/GaleConversationalAgent";
import { AgentConversationMessage } from "../totoms/gale/model/AgentConversationMessage";

export class SuppieAgent extends GaleConversationalAgent {

    async onMessage(message: AgentConversationMessage): Promise<AgentConversationMessage> {

        const config = this.config as ControllerConfig;

        const ai = genkit({
            plugins: [vertexAI()],
            model: vertexAI.model('gemini-2.0-flash-lite')
        });

        // Immediately publish a message to the conversation to let the user know that we have received the message and we are working on it. 
        this.publishMessage({
            conversationId: message.conversationId,
            messageId: uuid(),
            agentId: message.agentId,
            message: (await ai.generate("Generate a friendly and informal SHORT message to let the user know that we have received their message and we are working on it. The message should be something like: 'Hey! I got your message and I'm working on adding the items to the shopping list for you!'")).output,
            actor: "agent"
        })

        // 1. Get the names from the DB to give the AI an idea of the most common items picked by the user.
        // Instantiate the DB
        const db = await config.getMongoDb(config.getDBName());

        // Create the store
        const store = new ArchivedListStore(db, config);

        // Get the names (top 300)
        const names = await store.getDistinctItemNames(300);

        const finalOutputSchema = z.object({
            items: z.array(z.string().describe("Name of the item in the grocery shopping list. Only the name.")).describe("List of items in the shopping list")
        })

        // 2.1. First iteration to get the list of items, but not in a structured way, just to let the AI do its best to interpret the user input and correct the mispelled items.
        let extractedList = await ai.generate({
            prompt: `
                        You are a supermarket experts that knows all typical items that can be found in a supermarket in Denmark and Italy. 
                        You know ALL the names of grocery items in English (main language), Danish and Italian (second languages). 
                        You will receive lists of supermarket items (groceries shopping list) made by a user. 
                        The list is made from a AI-generated transcript of an audio recording where the user recorded items to be bought at the supermarket. 
        
                        Important: the transcript will MOST LIKELY contain errors as the user uses multiple languages, with the majority of items being dictated in English, but some in Danish and Italian. 
                        The AI that transcribes the audio is english-speaking so Danish (mostly) and Italian (some) items will most likely be mispelled and look like gibberish to you. 
        
                        Your task is to create the groceries shopping list from the transcript and CORRECT all the mispelled or misinterpreted item names. 
        
                        These are the most common items picked by the user: ${JSON.stringify(names)}.
                        
                        Use this list to try to reconcile names whenever you have a doubt. 
        
                        ## Your task: 
                        Create the groceries shopping list from the following transcription of the user's desires of items to be added to the list: 
                        ${message.message} 
                    `,
            output: {
                schema: finalOutputSchema
            }
        });

        // 2. Evaluate and iterate
        let attempts = 0;
        let evaluation;
        let evaluationsHistory = [];
        while (attempts < 3) {

            // Evaluate the output
            evaluation = await ai.generate({
                prompt: `
                            Evaluate the following list of items extracted from the user's transcription and correct it if you find any mistake. 
                            The list of items is: ${JSON.stringify(extractedList.output?.items)}. 
                            
                            The user's transcription is the following: ${message.message}. 
                            
                            Remember that the most common items picked by the user are: ${JSON.stringify(names)}. 
        
                            ## Your task: 
                            If you find any thing that looks like a mistake, propose a correction and explain why you think it's a mistake. 
        
                            ## Rules
                            - DO NOT change anything, just propose corrections.
                            - Make sure to double check with the user's transcript, because the previous extractor might have truncated or simplified some item names, removing important terms to understand the context. 
                                *An important example is "Bacon i tern", which might be truncated to "Bacon" but it's actually a specific type of bacon that the user usually buys and that is important to keep in the list.*
                            - Corrections are not mandatory. Only propose a correction if you are really sure that there is a mistake and that you know what the user meant.
                            - If the correction is the same as the corrected (extracted) item name, then it's not a correction and you should not propose it.
                        `,
                output: {
                    schema: z.object({
                        items: z.array(z.object({
                            name: z.string().describe("Original name of the item extracted from the user's transcription, with possible mistakes."),
                            correction: z.string().optional().nullable().describe("Proposed correction for the item name, if a mistake was found."),
                            reason: z.string().optional().nullable().describe("Explanation for why the correction was proposed."),
                        }))
                    })
                }
            });

            evaluationsHistory.push(evaluation.output?.items || []);

            // Check if there are any corrections proposed, if not, we can stop the iteration
            const correctionsProposed = evaluation.output?.items.filter(item => item.correction);
            if (!correctionsProposed || correctionsProposed.length === 0) {
                break;
            }

            // Refine 
            extractedList = await ai.generate({
                prompt: `
                            The following list of items was extracted from the user's transcription: ${JSON.stringify(extractedList.output?.items)}. 
                            An agent has evaluated this list and proposed the following corrections: ${JSON.stringify(evaluation.output)}.
                            
                            ## Your task: 
                            Refine the list of items based on the proposed corrections and explanations. 
                            If a correction is proposed and the reason is valid, apply the correction to the item name. 
                        `,
                output: {
                    schema: finalOutputSchema
                }

            });

            attempts++;
        }

        const confirmation = await ai.generate({
            prompt: `Generate a nice sentence to the user confirming that you have added the following number of items to the shopping list: ${extractedList.output?.items.length}. The sentence should be friendly and informal, like something a helpful assistant would say. "`,
            output: { schema: z.object({ confirmationMessage: z.string() }) }
        })

        return {
            conversationId: message.conversationId,
            messageId: message.messageId,
            agentId: message.agentId,
            message: confirmation.output?.confirmationMessage || "I have added the items to the shopping list for you!",
            actor: "agent"
        }
    }
}