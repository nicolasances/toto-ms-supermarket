import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ListItem } from "../model/ListItem";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { ControllerConfig } from "../Config";
import { SupermarketStore } from "../store/SupermarketStore";
import { MongoClient } from "mongodb";
import { LocationListStore } from "../store/LocationListStore";
import { LocationListItem } from "../model/LocationListItem";
import { SupermarketMLModel } from "../api/SupermarketMLModel";

/**
 * This process deletes an item from all location lists
 * 
 */
export class DeleteItemFromLocationLists {

    execContext: ExecutionContext;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
    }

    async do(itemId: string) {

        const config = this.execContext.config as ControllerConfig
        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        let client;

        logger.compute(cid, `Deleting list item [${itemId}] from all Location Lists.`)

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            const locationListStore = new LocationListStore(db, this.execContext);

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