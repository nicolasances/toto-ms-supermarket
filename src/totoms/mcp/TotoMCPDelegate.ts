import { TotoDelegate } from "../model/TotoDelegate";
import { TotoRequest } from "../model/TotoRequest";
import { UserContext } from "../model/UserContext";
import { ToolRequest } from "./ToolRequest";
import { ToolResponse } from "./ToolResponse";
import { TotoMCPToolDefinition } from "./TotoMCPToolDefinition";

export abstract class TotoMCPDelegate<I extends TotoRequest, O> extends TotoDelegate<I, O> {

    /**
     * Processes the incoming tool request and returns a Promise with the result.
     * 
     * You can override this method if:
     * - You want to have full control over the processing of the tool request, including validation, error handling, and response formatting.
     * - You want to differentiate the processing logic from the standard delegate processing (e.g., by calling different services, implementing custom logging, etc.)
     * 
     * @param input the input for the tool, validated against the tool's input schema
     * @param userContext the context of the user making the request, including authentication details
     * 
     * @example
     * ```typescript
     * public async processToolRequest(input: ToolRequest, userContext: UserContext): Promise<ToolResponse> {
     *  // Custom validation
     *  ... 
     *  // Custom processing logic
     *  ...
     *  // Custom error handling
     *  ...
     *  // Custom response formatting
     *  return { 
     *   content: [
     *    {
     *      type: "text", 
     *      text: `This is what you have asked for, related to xyz <...>: ${JSON.stringify(result, null, 2)}`
     *    }
     *  ]};
     */
    public async processToolRequest(input: ToolRequest, userContext: UserContext): Promise<ToolResponse> {

        // Convert tool request into a TotoRequest 
        // For now this does not do anything, as both are basically type any
        const totoRequest = input as unknown as I;

        // Call the normal delegate processing method
        const result = await this.do(totoRequest, userContext);

        // Convert the result into a ToolResponse
        // Tool responses, in this version of the @modelcontextprotocol SDK (still version 1) require a specific format: 
        return {
            content: [
                {
                    type: "text",
                    text: `${JSON.stringify(result, null, 2)}`
                }
            ]
        }

    }

    /**
     * Returns the definition of the tool, including its name, title, description, and input schema.
     */
    public abstract getToolDefinition(): TotoMCPToolDefinition;
}