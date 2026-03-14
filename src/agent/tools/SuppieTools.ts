import { ControllerConfig } from "Config";
import { Genkit, ToolAction, z } from "genkit";
import { ListItem } from "model/ListItem";
import { ListStore } from "store/ListStore";

export function createTools(ai: Genkit, config: ControllerConfig, cid?: string): ToolAction[] {

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
        const listStore = new ListStore(db, config);

        const results = await listStore.addItemsToList(items.map(item => ({ name: item, ticked: false } as ListItem)));

        return { success: results.length === items.length };
    });

    return [getSupermarketListItems, addItemsToSupermarketList];
}
