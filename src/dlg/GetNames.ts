import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger, TotoMCPDelegate, TotoMCPToolDefinition } from "totoms";
import { ControllerConfig } from "../Config";
import { ArchivedListStore } from "../store/ArchivedListStore";
import z from "zod";

interface GetNamesRequest extends TotoRequest {
}

interface GetNamesResponse {
    names: string[];
}

/**
 * Gets the item names from all archived lists. 
 * 
 * This is a method that would be mostly used for 
 *  - Autocomplete on the front-end
 *  - Creating a dictionnary of terms for ML training
 * 
 */
export class GetNames extends TotoMCPDelegate<GetNamesRequest, GetNamesResponse> {

    getToolDefinition(): TotoMCPToolDefinition {
        return {
            name: "getCommonItems", 
            description: "Gets the names of the most commonly shopped items.",
            inputSchema: z.object({}),
            title: "Get common shopping items names"
        }
    }

    async do(req: GetNamesRequest, userContext?: UserContext): Promise<GetNamesResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());

            // Create the store
            const store = new ArchivedListStore(db, config);

            // Get the names
            const names = await store.getDistinctItemNames(300);

            return { names: names }


        } catch (error) {

            if (error instanceof ValidationError) {
                throw error;
            }
            else {
                logger.compute(this.cid, `Error getting names: ${error}`);
                throw error;
            }

        }

    }

    parseRequest(req: Request): GetNamesRequest {
        return {};
    }

}