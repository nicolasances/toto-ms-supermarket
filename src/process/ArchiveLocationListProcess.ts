import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { SupermarketStore } from "../store/SupermarketStore";
import { LocationListStore } from "../store/LocationListStore";
import { v4 as uuidv4 } from 'uuid'
import { ArchivedListItem } from "../model/ArchivedListItem";
import { Process } from "../util/MongoTransaction";
import { Db } from "mongodb";
import { ArchivedListStore } from "../store/ArchivedListStore";


export class ArchiveLocationListProcess extends Process<{ done: boolean }> {

    execContext: ExecutionContext;
    supermarketId: string;

    constructor(execContext: ExecutionContext, supermarketId: string) {
        super();
        this.execContext = execContext;
        this.supermarketId = supermarketId;
    }

    async do(db: Db): Promise<{ done: boolean }> {

        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        // Instantiate stores
        const supermarketStore = new SupermarketStore()
        const locationListStore = new LocationListStore(db, this.execContext);

        // Get the supermarket
        const supermarket = await supermarketStore.getSupermarket(this.supermarketId);

        logger.compute(cid, `Archiving the Location List of supermarket [${JSON.stringify(supermarket)}]`)

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
        await new ArchivedListStore(db, this.execContext).insertItems(itemsToArchive);

        // Done
        logger.compute(cid, `Archived [${itemsToArchive.length}] items with listId [${listId}]`)

        return { done: true }

    }
}