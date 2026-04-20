import { Request } from "express";
import { MessageDestination, TotoMCPDelegate, TotoMCPToolDefinition, TotoRequest, TotoMessage, UserContext, ValidationError, Logger, newTotoServiceToken } from "totoms";
import { ControllerConfig } from "../Config";
import { ListItem } from "../model/ListItem";
import { AddItemsToListProcess } from "../process/AddItemsToListProcess";
import moment from "moment-timezone";
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
                    const timestamp = moment().tz("Europe/Rome").format("YYYY.MM.DD HH:mm:ss");
                    const message: TotoMessage = {
                        timestamp,
                        cid,
                        id: itemId,
                        type: "itemAdded",
                        msg: `Item [${itemId}] added to the Supermarket List`,
                        data: { item, authToken }
                    };
                    await this.messageBus.publishMessage(new MessageDestination({ topic: "supermarket" }), message);
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
