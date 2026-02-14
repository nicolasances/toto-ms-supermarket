import { ControllerConfig } from "../Config";
import { SupermarketStore } from "../store/SupermarketStore";
import { LocationListStore } from "../store/LocationListStore";
import { v4 as uuidv4 } from 'uuid'
import { ArchivedListItem } from "../model/ArchivedListItem";
import { Process } from "../util/MongoTransaction";
import { Db } from "mongodb";
import { ArchivedListStore } from "../store/ArchivedListStore";
import { Logger } from "totoms";


export class ArchiveLocationListProcess extends Process<{ done: boolean }> {

    config: ControllerConfig;
    cid: string;
    supermarketId: string;

    constructor(config: ControllerConfig, cid: string, supermarketId: string) {
        super();
        this.config = config;
        this.cid = cid;
        this.supermarketId = supermarketId;
    }

    async do(db: Db): Promise<{ done: boolean }> {

        const logger = Logger.getInstance();

        // Instantiate stores
        const supermarketStore = new SupermarketStore()
        const locationListStore = new LocationListStore(db, this.cid, this.config);

        // Get the supermarket
        const supermarket = await supermarketStore.getSupermarket(this.supermarketId);

        logger.compute(this.cid, `Archiving the Location List of supermarket [${JSON.stringify(supermarket)}]`)

        // Find all the items in the Location List
        const items = await locationListStore.getLocationListItems(supermarket);

        // Generate a uuid for the archived list
        const listId = uuidv4();

        // Generate a list of Archived items to save
        const itemsToArchive: ArchivedListItem[] = [];

        for (const item of items) {

            itemsToArchive.push(ArchivedListItem.fromLocationListItem(listId, item, supermarket))

        }

        // Save the list
        if (itemsToArchive.length > 0) await new ArchivedListStore(db, this.cid, this.config).insertItems(itemsToArchive);

        // Done
        logger.compute(this.cid, `Archived [${itemsToArchive.length}] items with listId [${listId}]`)

        return { done: true }

    }
}