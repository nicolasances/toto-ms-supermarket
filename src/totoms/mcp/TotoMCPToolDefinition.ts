import z from "zod";

export interface TotoMCPToolDefinition {
    name: string;
    title: string;
    description: string;
    inputSchema: z.ZodObject<any>;
}