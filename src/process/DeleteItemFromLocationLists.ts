import { ListItem } from "../model/ListItem";
import { ValidationError, TotoRuntimeError } from "totoms";
import { ControllerConfig } from "../Config";
import { SupermarketStore } from "../store/SupermarketStore";
import { MongoClient } from "mongodb";
import { LocationListStore } from "../store/LocationListStore";
import { LocationListItem } from "../model/LocationListItem";
import { SupermarketMLModel } from "../api/SupermarketMLModel";
import { Logger } from "totoms";

/**
 * This process deletes an item from all location lists
 * 
 */
export class DeleteItemFromLocationLists {

    config: ControllerConfig;
    cid: string;

    constructor(config: ControllerConfig, cid: string) {
        this.config = config;
        this.cid = cid;
    }

    async do(itemId: string) {

        const logger = Logger.getInstance();

        let client;

        logger.compute(this.cid, `Deleting list item [${itemId}] from all Location Lists.`)

        try {

            // Instantiate the DB
            const db = await this.config.getMongoDb(this.config.getDBName());
            client = await this.config.getMongoClient(this.config.getDBName());

            const locationListStore = new LocationListStore(db, this.cid, this.config);

            // Delete item from all lists
            await locationListStore.deleteItemFromAllLists(itemId)


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