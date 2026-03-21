import { ControllerConfig } from "Config";
import { Genkit, ToolAction, z } from "genkit";
import { ListItem } from "model/ListItem";
import moment from "moment-timezone";
import { AddItemsToListProcess } from "process/AddItemsToListProcess";
import { ListStore } from "store/ListStore";
import { MessageDestination, newTotoServiceToken, TotoMessage, TotoMessageBus } from "totoms";

export function createTools(ai: Genkit, config: ControllerConfig, messageBus: TotoMessageBus, cid?: string): ToolAction[] {

    const getSupermarketListItems = ai.defineTool({
        name: "getSupermarketListItems",
        description: "Returns the current items in the user's main supermarket shopping list.",
        inputSchema: z.object({}),
        outputSchema: z.object({
            items: z.array(z.string()).describe("The list of items in the supermarket shopping list."),
        }),
    }, async () => {
        const db = await config.getMongoDb(config.getDBName());
        const items = await new ListStore(db, config).getItems();

        return {
            items: items.map(item => item.name)
        };
    });

    const addItemsToSupermarketList = ai.defineTool({
        name: "addItemsToSupermarketList",
        description: "Adds items to the user's main supermarket shopping list.",
        inputSchema: z.object({
            items: z.array(z.string()).describe("The list of items to add to the supermarket shopping list."),
        }),
        outputSchema: z.object({
            success: z.boolean().describe("Whether the operation was successful."),
        }),
    }, async ({ items }) => {

        const db = await config.getMongoDb(config.getDBName());

        const itemsToAdd = items.map(name => ({ name, ticked: false } as ListItem))

        await new AddItemsToListProcess(
            newTotoServiceToken(config),
            config,
            cid ?? "",
            itemsToAdd,
            async (itemId: string, item: ListItem, authToken: string) => {

                const timestamp = moment().tz('Europe/Rome').format('YYYY.MM.DD HH:mm:ss');

                const message: TotoMessage = {
                    timestamp: timestamp,
                    cid: cid ?? "",
                    id: itemId,
                    type: "itemAdded",
                    msg: `Item [${itemId}] added to the Supermarket List`,
                    data: { item: item, authToken: authToken }
                };

                await messageBus.publishMessage(new MessageDestination({ topic: "supermarket" }), message)
            }
        ).do(db);

        return {
            success: true
        }

    });

    return [getSupermarketListItems, addItemsToSupermarketList];
}
