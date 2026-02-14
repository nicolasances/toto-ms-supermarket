import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";
import { ValidationError, TotoRuntimeError } from "totoms";
import { EventPublisher } from "../evt/EventPublisher";
import { Db } from "mongodb";
import { Process } from "../util/MongoTransaction";

export class AddItemToListProcess extends Process<{ id: string }> {

    config: ControllerConfig;
    cid: string;
    item: ListItem;
    authToken: string;

    constructor(authToken: string, config: ControllerConfig, cid: string, item: ListItem) {
        super();
        this.config = config;
        this.cid = cid;
        this.item = item;
        this.authToken = authToken;
    }

    async do(db: Db): Promise<{ id: string }> {

        // Create the store
        const store = new ListStore(db, this.cid, this.config);

        // Save the item
        const itemId = await store.addItemToList(this.item);

        // Publish the event on PubSub
        await new EventPublisher(this.config, this.cid, "supermarket").publishEvent(itemId, "item-added", `Item [${this.item.id}] added to the Supermarket List`, { item: this.item, authToken: this.authToken })

        // Return the created Id
        return { id: itemId }

    }

}