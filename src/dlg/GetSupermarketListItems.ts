import { Request } from "express";
import { TotoMCPDelegate, TotoMCPToolDefinition, TotoRequest, UserContext, ValidationError, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import z from "zod";

interface GetSupermarketListItemsRequest extends TotoRequest {
}

interface GetSupermarketListItemsResponse {
    items: string[];
}

export class GetSupermarketListItems extends TotoMCPDelegate<GetSupermarketListItemsRequest, GetSupermarketListItemsResponse> {

    getToolDefinition(): TotoMCPToolDefinition {
        return {
            name: "getSupermarketListItems",
            description: "Returns the current items in the user's main supermarket shopping list.",
            inputSchema: z.object({}),
            title: "Get supermarket list items"
        };
    }

    async do(req: GetSupermarketListItemsRequest, userContext?: UserContext): Promise<GetSupermarketListItemsResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        try {

            const db = await config.getMongoDb(config.getDBName());
            const items = await new ListStore(db, config).getItems();

            return { items: items.map(item => item.name) };

        } catch (error) {

            if (error instanceof ValidationError) throw error;

            logger.compute(this.cid, `Error getting supermarket list items: ${error}`);
            throw error;

        }

    }

    parseRequest(req: Request): GetSupermarketListItemsRequest {
        return {};
    }

}
