import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";
import { Db } from "mongodb";
import { Process } from "../util/MongoTransaction";

export class AddItemToListProcess extends Process<{ id: string }> {

    config: ControllerConfig;
    cid: string;
    item: ListItem;
    authToken: string;
    publishItemAdded: (itemId: string, item: ListItem, authToken: string) => Promise<void>;

    constructor(
        authToken: string,
        config: ControllerConfig,
        cid: string,
        item: ListItem,
        publishItemAdded: (itemId: string, item: ListItem, authToken: string) => Promise<void>
    ) {
        super();
        this.config = config;
        this.cid = cid;
        this.item = item;
        this.authToken = authToken;
        this.publishItemAdded = publishItemAdded;
    }

    async do(db: Db): Promise<{ id: string }> {

        // Create the store
        const store = new ListStore(db, this.cid, this.config);

        // Save the item
        const itemId = await store.addItemToList(this.item);

        // Publish the event on PubSub
        await this.publishItemAdded(itemId, this.item, this.authToken)

        // Return the created Id
        return { id: itemId }

    }

}