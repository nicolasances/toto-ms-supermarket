import { Request } from "express";
import { TotoMCPDelegate, TotoMCPToolDefinition, TotoRequest, UserContext, ValidationError, Logger, newTotoServiceToken } from "totoms";
import { ControllerConfig } from "../Config";
import { ListItem } from "../model/ListItem";
import { AddItemsToListProcess } from "../process/AddItemsToListProcess";
import { publishItemAdded } from "../util/SupermarketEventPublisher";
import z from "zod";

interface AddItemsToSupermarketListRequest extends TotoRequest {
    items: string[];
}

interface AddItemsToSupermarketListResponse {
    success: boolean;
}

export class AddItemsToSupermarketList extends TotoMCPDelegate<AddItemsToSupermarketListRequest, AddItemsToSupermarketListResponse> {

    getToolDefinition(): TotoMCPToolDefinition {
        return {
            name: "addItemsToSupermarketList",
            description: "Adds one or more items to the user's main supermarket shopping list.",
            inputSchema: z.object({
                items: z.array(z.string()).describe("The list of items to add to the supermarket shopping list.")
            }),
            title: "Add items to supermarket list"
        };
    }

    async do(req: AddItemsToSupermarketListRequest, userContext?: UserContext): Promise<AddItemsToSupermarketListResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();
        const cid = this.cid ?? "";

        try {

            const db = await config.getMongoDb(config.getDBName());
            const authToken = newTotoServiceToken(config);
            const itemsToAdd = req.items.map(name => new ListItem(name, false));

            await new AddItemsToListProcess(
                authToken,
                config,
                cid,
                itemsToAdd,
                async (itemId: string, item: ListItem) => {
                    await publishItemAdded(config, cid, itemId, item, authToken);
                }
            ).do(db);

            return { success: true };

        } catch (error) {

            if (error instanceof ValidationError) throw error;

            logger.compute(this.cid, `Error adding items to supermarket list: ${error}`);
            throw error;

        }

    }

    parseRequest(req: Request): AddItemsToSupermarketListRequest {
        const items = req.body?.items;
        return { items: Array.isArray(items) ? items : [] };
    }

}
