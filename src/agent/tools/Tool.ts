import { z } from 'genkit'

export interface Tool {

    definition: {
        name: string,
        description: string,
        inputSchema: z.ZodTypeAny, 
        outputSchema: z.ZodTypeAny,
    }

    useTool(input: any): Promise<any>;
    
}