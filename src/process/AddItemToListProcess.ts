import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from 'toto-api-controller/dist/model/TotoRuntimeError'
import { EventPublisher } from "../evt/EventPublisher";
import { Db } from "mongodb";
import { Process } from "../util/MongoTransaction";

export class AddItemToListProcess extends Process<{ id: string }> {

    execContext: ExecutionContext;
    item: ListItem;
    authToken: string;

    constructor(authToken: string, execContext: ExecutionContext, item: ListItem) {
        super();
        this.execContext = execContext;
        this.item = item;
        this.authToken = authToken;
    }

    async do(db: Db): Promise<{ id: string }> {

        // Create the store
        const store = new ListStore(db, this.execContext);

        // Save the item
        const itemId = await store.addItemToList(this.item);

        // Publish the event on PubSub
        await new EventPublisher(this.execContext, "supermarket").publishEvent(itemId, "item-added", `Item [${this.item.id}] added to the Supermarket List`, { item: this.item, authToken: this.authToken })

        // Return the created Id
        return { id: itemId }

    }

}