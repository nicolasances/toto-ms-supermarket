import { genkit, z } from "genkit";
import { awsBedrock } from "genkitx-aws-bedrock";
import { TotoDelegate, UserContext } from "totoms";
import { getModel } from "../util/Models";
import { ControllerConfig } from "../Config";
import { ArchivedListStore } from "../store/ArchivedListStore";
import { Request } from "express";

export class AgentDlg extends TotoDelegate<AgentRequest, AgentResponse> {

    protected async do(req: AgentRequest, userContext?: UserContext): Promise<AgentResponse> {

        const config = this.config as ControllerConfig;

        // 1. Get the names from the DB to give the AI an idea of the most common items picked by the user.
        // Instantiate the DB
        const db = await config.getMongoDb(config.getDBName());

        // Create the store
        const store = new ArchivedListStore(db, this.cid!, config);

        // Get the names (top 300)
        const names = await store.getDistinctItemNames(300);

        // 2. Create the prompt for the AI with the list of names and the user input
        const ai = genkit({
            plugins: [
                awsBedrock({ region: "eu-north-1" }),
            ],
            model: getModel("anthropic.claude-3.7-sonnet", "eu"),
        });

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
                ${req.prompt} 
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
                    
                    The user's transcription is: ${req.prompt}. 
                    
                    Remember that the most common items picked by the user are: ${JSON.stringify(names)}. 

                    ## Your task: 
                    If you find any thing that looks like a mistake, propose a correction and explain why you think it's a mistake. 
                    DO NOT change anything, just propose corrections.
                    Corrections are not mandatory. Only propose a correction if you are really sure that there is a mistake and that you know what the user meant.
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

        return { items: extractedList.output?.items || [], agentInfo: { attempts, evaluationsHistory } };

    }

    parseRequest(req: Request): AgentRequest {
        return {
            prompt: req.body.prompt
        };
    }


}

interface AgentRequest {
    prompt: string;
}

interface AgentResponse {
    items: string[];
    agentInfo?: {
        attempts: number;
        evaluationsHistory?: any[];
    }
}