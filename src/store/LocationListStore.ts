import { Db, ObjectId } from "mongodb";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ControllerConfig } from "../Config";
import { Supermarket } from "../model/Supermarket";
import { LocationListItem } from "../model/LocationListItem";

export const F_ITEM_ID = 'itemId';  // Id of the item in the main supermarket list
export const F_NAME = 'name';
export const F_INDEX = 'index';
export const F_USER_INDEX = 'userIndex';
export const F_SUP_NAME = 'supermarketName';
export const F_SUP_LOCATION = 'supermarketLocation';
export const F_TICKED = 'ticked';

export class LocationListStore {

    db: Db;
    execContext: ExecutionContext;
    config: ControllerConfig;

    constructor(db: Db, execContext: ExecutionContext) {
        this.db = db;
        this.config = execContext.config as ControllerConfig;
        this.execContext = execContext;
    }

    /**
     * Retrieves the Location List for the specified supermarket
     * 
     * @param supermarket the supermarket's location
     */
    async getLocationListItems(supermarket: Supermarket): Promise<LocationListItem[]> {

        const locationListItems = []

        const cursor = this.db.collection(this.config.getCollections().locationLists).find({ [F_SUP_NAME]: supermarket.name, [F_SUP_LOCATION]: supermarket.location }).sort({ [F_INDEX]: 1 })

        while (await cursor.hasNext()) {

            const llitem = await cursor.next()

            if (!llitem) continue;

            // Conver into LocationListItem
            const item = LocationListItem.fromPersistentBson(llitem);

            // Add to result list
            locationListItems.push(item)

        }

        return locationListItems;

    }

    /**
     * Deletes the item from ALL location lists
     * 
     * @param itemId the id of the item to delete
     */
    async deleteItemFromAllLists(itemId: string) {

        await this.db.collection(this.config.getCollections().locationLists).deleteMany({ [F_ITEM_ID]: itemId })

    }

    /**
     * Adds an item to a location list. 
     * Contextually shiftes all the items with (index >= this items' index) forward (increases all other indices of 1)
     * 
     * @param item the item to add
     */
    async addLocationListItem(item: LocationListItem): Promise<string> {

        // Increase all indices >= item.index of 1
        await this.db.collection(this.config.getCollections().locationLists).updateMany(
            { index: { $gte: item.index } },
            { $inc: { index: 1 } }
        )

        // Insert the new item
        const result = await this.db.collection(this.config.getCollections().locationLists).insertOne(item);

        return result.insertedId.toHexString();

    }

    /**
     * Updates the provided item
     * 
     * @param itemId the item id
     * @param item the updated item
     */
    async updateItem(itemId: string, item: LocationListItem) {

        const result = await this.db.collection(this.config.getCollections().locationLists).updateOne({ _id: new ObjectId(itemId) }, { $set: item })

        return result

    }

    /**
     * Ticks or unticks an item
     * 
     * @param itemId the id of the item to update
     * @param newUserIndex the newly assigned user index
     * @param ticked the updated ticked value
     */
    async updateTick(itemId: string, newUserIndex: number, ticked: boolean) {

        const result = await this.db.collection(this.config.getCollections().locationLists).updateOne({ _id: new ObjectId(itemId) }, { $set: { [F_TICKED]: ticked, [F_USER_INDEX]: newUserIndex } })

        return result;

    }

    /**
     * Deletes all Location Lists
     */
    async deleteAllLocationLists() {

        await this.db.collection(this.config.getCollections().locationLists).deleteMany({});

    }

    /**
     * Retrieve unticked items from that location
     * 
     * @param supermarket the location
     */
    async getUntickedItems(supermarket: Supermarket): Promise<LocationListItem[]> {

        const locationListItems = []

        const cursor = this.db.collection(this.config.getCollections().locationLists).find({ [F_SUP_LOCATION]: supermarket.location, [F_SUP_NAME]: supermarket.name, [F_TICKED]: false })

        while (await cursor.hasNext()) {

            const llitem = await cursor.next()

            if (!llitem) continue;

            // Conver into LocationListItem
            const item = LocationListItem.fromPersistentBson(llitem);

            // Add to result list
            locationListItems.push(item)

        }

        return locationListItems;

    }

    /**
     * Deletes all items that are not ticked 
     */
    async deleteUntickedItems() {

        await this.db.collection(this.config.getCollections().locationLists).deleteMany({ [F_TICKED]: false })

    }

}