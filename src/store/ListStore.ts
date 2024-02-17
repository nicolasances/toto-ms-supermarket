import { Db, ObjectId } from "mongodb";
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

    /**
     * Delets the item from the main supermarket list
     * 
     * @param itemId the id of the item to delete
     */
    async deleteItem(itemId: string) {

        await this.db.collection(this.config.getCollections().items).deleteOne({ _id: new ObjectId(itemId) })

    }

    /**
     * Updates a list item
     * 
     * @param itemId the id of the item to update
     * @param item the item to update
     */
    async updateItem(itemId: string, item: ListItem) {

        // Update the item
        await this.db.collection(this.config.getCollections().items).updateOne({ _id: new ObjectId(itemId) }, { $set: item })

    }

    /**
     * Retrieves all the available items
     */
    async getItems(): Promise<ListItem[]> {

        const items = this.db.collection(this.config.getCollections().items).find();

        let convertedItems = []

        while (await items.hasNext()) {

            const bson = await items.next();

            const item = bson ? ListItem.fromMongoBSON(bson) : null

            if (item) convertedItems.push(item)
        }

        return convertedItems;

    }

    /**
     * Deletes all items in the main list
     */
    async deleteAllItems() {

        await this.db.collection(this.config.getCollections().items).deleteMany({});

    }
}