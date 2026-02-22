import { genkit, z } from "genkit";
import { TotoDelegate, UserContext, ValidationError } from "totoms";
import { getModel } from "../util/Models";
import { ControllerConfig } from "../Config";
import { ArchivedListStore } from "../store/ArchivedListStore";
import { Request } from "express";
import { AgentStatusStore } from "../store/AgentStatusStore";
import { randomUUID } from "crypto";

export class AgentPostMessageDlg extends TotoDelegate<AgentPostMessageRequest, AgentPostMessageResponse> {

    protected async do(req: AgentPostMessageRequest, userContext?: UserContext): Promise<AgentPostMessageResponse> {

        const messageId = randomUUID();
        const statusStore = new AgentStatusStore();

        statusStore.create(req.agentId, req.conversationId, messageId);
        statusStore.append(req.agentId, req.conversationId, messageId, "queued", { messageId });

        const run = async () => {
            try {
                statusStore.append(req.agentId, req.conversationId, messageId, "status", { step: "starting" });

                const config = this.config as ControllerConfig;

                const db = await config.getMongoDb(config.getDBName());
                const store = new ArchivedListStore(db, this.cid!, config);
                const names = await store.getDistinctItemNames(300);

                statusStore.append(req.agentId, req.conversationId, messageId, "status", { step: "names-loaded", count: names.length });

                const ai = genkit({
                    plugins: [
                    ],
                    model: getModel("anthropic.claude-3.7-sonnet", "eu"),
                });

                const finalOutputSchema = z.object({
                    items: z.array(z.string().describe("Name of the item in the grocery shopping list. Only the name.")).describe("List of items in the shopping list")
                });

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
                        ${req.prompt} 
                    `,
                    output: {
                        schema: finalOutputSchema
                    }
                });

                statusStore.append(req.agentId, req.conversationId, messageId, "items", { step: "initial", items: extractedList.output?.items || [] });

                let attempts = 0;
                let evaluation;
                const evaluationsHistory: any[] = [];

                while (attempts < 3) {

                    statusStore.append(req.agentId, req.conversationId, messageId, "status", { step: "evaluate", attempt: attempts + 1 });

                    evaluation = await ai.generate({
                        prompt: `
                            Evaluate the following list of items extracted from the user's transcription and correct it if you find any mistake. 
                            The list of items is: ${JSON.stringify(extractedList.output?.items)}. 
                            
                            The user's transcription is the following: ${req.prompt}. 
                            
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

                    statusStore.append(req.agentId, req.conversationId, messageId, "evaluation", { attempt: attempts + 1, items: evaluation.output?.items || [] });

                    const correctionsProposed = evaluation.output?.items.filter(item => item.correction);
                    if (!correctionsProposed || correctionsProposed.length === 0) {
                        break;
                    }

                    statusStore.append(req.agentId, req.conversationId, messageId, "status", { step: "refine", attempt: attempts + 1 });

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

                    statusStore.append(req.agentId, req.conversationId, messageId, "items", { step: "refined", attempt: attempts + 1, items: extractedList.output?.items || [] });

                    attempts++;
                }

                statusStore.append(req.agentId, req.conversationId, messageId, "done", { items: extractedList.output?.items || [], agentInfo: { attempts, evaluationsHistory } });

            } catch (error) {
                statusStore.append(req.agentId, req.conversationId, messageId, "error", { message: `${error}` });
            }
        };

        void run();

        return { messageId };
    }

    parseRequest(req: Request): AgentPostMessageRequest {
        const agentId = String(req.params.agentId || "").trim();
        const conversationId = String(req.params.conversationId || "").trim();
        const prompt = String(req.body?.prompt || "").trim();

        if (!agentId) throw new ValidationError(400, "No agentId provided");
        if (!conversationId) throw new ValidationError(400, "No conversationId provided");
        if (!prompt) throw new ValidationError(400, "No prompt provided");

        return { agentId, conversationId, prompt };
    }

}

interface AgentPostMessageRequest {
    agentId: string;
    conversationId: string;
    prompt: string;
}

interface AgentPostMessageResponse {
    messageId: string;
}
