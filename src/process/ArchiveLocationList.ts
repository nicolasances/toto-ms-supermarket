import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { ControllerConfig } from "../Config";
import { SupermarketStore } from "../store/SupermarketStore";
import { LocationListStore } from "../store/LocationListStore";
import { v4 as uuidv4 } from 'uuid'
import { ArchivedListItem } from "../model/ArchivedListItem";


export class ArchiveLocationList {

    execContext: ExecutionContext;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
    }

    async do(supermarketId: string) {


        const config = this.execContext.config as ControllerConfig
        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        let client;

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            // Instantiate stores
            const supermarketStore = new SupermarketStore()
            const locationListStore = new LocationListStore(db, this.execContext);

            // Get the supermarket
            const supermarket = await supermarketStore.getSupermarket(supermarketId);

            logger.compute(cid, `Archiving the Location List of supermarket [${JSON.stringify(supermarket)}]`)

            // Find all the items in the Location List
            const items = await locationListStore.getLocationListItems(supermarket);

            // Generate a uuid for the archived list
            const listId = uuidv4();

            // Generate a list of Archived items to save
            const itemsToArchive = [];

            for (const item of items) {

                itemsToArchive.push(ArchivedListItem.fromLocationListItem(listId, item, supermarket))

            }

            // Save the list
            await db.collection(config.getCollections().archivedLists).insertMany(itemsToArchive)

            // Done
            logger.compute(cid, `Archived [${itemsToArchive.length}] items with listId [${listId}]`)


        } catch (error) {

            if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                throw error;
            }
            else {
                console.log(error);
                throw error;
            }

        }
        finally {
            if (client) client.close();
        }
    }
}