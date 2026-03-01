import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";
import { Db } from "mongodb";
import { Process } from "../util/MongoTransaction";

/**
 * Adds multiple items to the list in a single transaction.
 */
export class AddItemsToListProcess extends Process<{ id: string } | null> {

    config: ControllerConfig;
    cid: string;
    items: ListItem[];
    authToken: string;
    publishItemAdded: (itemId: string, item: ListItem, authToken: string) => Promise<void>;

    constructor(
        authToken: string,
        config: ControllerConfig,
        cid: string,
        items: ListItem[],
        publishItemAdded: (itemId: string, item: ListItem, authToken: string) => Promise<void>
    ) {
        super();
        this.config = config;
        this.cid = cid;
        this.items = items;
        this.authToken = authToken;
        this.publishItemAdded = publishItemAdded;
    }

    async do(db: Db): Promise<{ id: string } | null> {

        // Create the store
        const store = new ListStore(db, this.cid, this.config);

        // Remove items that are already there
        const existingItems = await store.getItems();
        const existingItemNames = existingItems.map(item => item.name.toLowerCase());
        
        this.items = this.items.filter(item => !existingItemNames.includes(item.name.toLowerCase()));

        if (this.items.length === 0) return null;

        // Save the item
        const itemIds = await store.addItemsToList(this.items);

        // Publish the event on PubSub
        for (let i = 0; i < this.items.length; i++) {
            await this.publishItemAdded(itemIds[i], this.items[i], this.authToken);
        }

        // Return the created Ids
        return { id: itemIds[0] }

    }

}