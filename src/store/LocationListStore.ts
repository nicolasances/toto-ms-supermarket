import { Db, ObjectId } from "mongodb";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ControllerConfig } from "../Config";
import { Supermarket } from "../model/Supermarket";
import { LocationListItem } from "../model/LocationListItem";

export const F_NAME = 'name';
export const F_INDEX = 'index';
export const F_SUP_NAME = 'supermarketName';
export const F_SUP_LOCATION = 'supermarketLocation';

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

        const cursor = this.db.collection(this.config.getCollections().locationLists).find({ [F_SUP_NAME]: supermarket.name, [F_SUP_LOCATION]: supermarket.location })

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
     * Adds an item to a location list
     * 
     * @param item the item to add
     */
    async addLocationListItem(item: LocationListItem): Promise<string> {

        const result = await this.db.collection(this.config.getCollections().locationLists).insertOne(item);

        return result.insertedId.toHexString();

    }

}