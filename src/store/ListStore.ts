import { Db } from "mongodb";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ControllerConfig } from "../Config";
import { ListItem } from "../model/ListItem";

export class ListStore {

    db: Db;
    execContext: ExecutionContext;
    config: ControllerConfig;

    constructor(db: Db, execContext: ExecutionContext) {
        this.db = db;
        this.config = execContext.config as ControllerConfig;
        this.execContext = execContext;
    }

    /**
     * Adds an item to the list 
     * 
     * @param item the item to add
     */
    async addItemToList(item: ListItem): Promise<string> {

        // Save to db
        const result = await this.db.collection(this.config.getCollections().items).insertOne(item);

        return result.insertedId.toHexString();

    }
}