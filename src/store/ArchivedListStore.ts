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

export class ArchivedListStore {

    db: Db;
    execContext: ExecutionContext;
    config: ControllerConfig;

    constructor(db: Db, execContext: ExecutionContext) {
        this.db = db;
        this.config = execContext.config as ControllerConfig;
        this.execContext = execContext;
    }

    /**
     * Extracts distinct item names from the archive. 
     * Item names are sorted with the most common ones (max count) on top.
     * 
     * @param maxItems max num of items to extract
     */
    async getDistinctItemNames(maxItems: number = 200) {

        // Aggregation pipeline
        const pipeline = []

        // Group
        pipeline.push({ $group: { _id: `\$${F_NAME}`, count: { $sum: 1 } } })

        // Sort
        pipeline.push({ $sort: { count: -1 } })

        const result = await this.db.collection(this.config.getCollections().archivedLists).aggregate(pipeline).toArray()

        // Extract only the names
        const names = result.map(entry => entry._id)

        return names;
    }

}