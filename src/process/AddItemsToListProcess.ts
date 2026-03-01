import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";
import { Db } from "mongodb";
import { Process } from "../util/MongoTransaction";

/**
 * Adds multiple items to the list in a single transaction.
 */
export class AddItemsToListProcess extends Process<{ id: string }> {

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

    async do(db: Db): Promise<{ id: string }> {

        // Create the store
        const store = new ListStore(db, this.cid, this.config);

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