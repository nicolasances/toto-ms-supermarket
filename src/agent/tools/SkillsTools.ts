import { Tool } from "./Tool";
import { z } from 'genkit'

export class SkillTool implements Tool {

    definition = {
        name: "",
        description: "",
        inputSchema: z.string().describe("The name of the skill that for which you'd like instructions"),
        outputSchema: z.string().describe("The instructions on how to use the skill, in markdown format"),
    }
    commonItems: string[];

    constructor(names: string[]) {
        this.commonItems = names;
    }

    async useTool(input: any): Promise<any> {

        if (input === 'addItems') {
            return `
                You are a grocery shopping expert that knows all typical items that can be found in a supermarket in Denmark and Italy. 
                You know ALL the names of grocery items in English (main language), Danish and Italian (second languages). 
                If you receive lists of supermarket items (groceries shopping list) made by a user, the list is made from a AI-generated transcript of an audio recording where the user recorded items to be bought at the supermarket. 

                Important: the transcript will MOST LIKELY contain errors as the user uses multiple languages, with the majority of items being dictated in English, but some in Danish and Italian. 
                The AI that transcribes the audio is english-speaking so Danish (mostly) and Italian (some) items will most likely be mispelled and look like gibberish to you. 

                This skill allows you to create the groceries shopping list from the transcript and CORRECT all the mispelled or misinterpreted item names. 

                These are the most common items picked by the user: ${JSON.stringify(this.commonItems)}.
                        
            `
        }

        return `I don't know how to use the skill ${input} yet.`
    }


}

