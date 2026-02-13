import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { ListItem } from "../model/ListItem";
import { EventPublisher } from "../evt/EventPublisher";
import { ArchivedListStore } from "../store/ArchivedListStore";

interface GetNamesRequest extends TotoRequest {
}

interface GetNamesResponse {
    names: string[];
}

/**
 * Gets the item names from all archived lists. 
 * 
 * This is a method that would be mostly used for 
 *  - Autocomplete on the front-end
 *  - Creating a dictionnary of terms for ML training
 * 
 */
export class GetNames extends TotoDelegate<GetNamesRequest, GetNamesResponse> {

    async do(req: GetNamesRequest, userContext?: UserContext): Promise<GetNamesResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        let client;

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());
            client = await config.getMongoClient(config.getDBName());

            // Create the store
            const store = new ArchivedListStore(db, this.cid!, config);

            // Get the names
            const names = await store.getDistinctItemNames(300);

            return { names: names }


        } catch (error) {

            if (error instanceof ValidationError) {
                throw error;
            }
            else {
                logger.compute(this.cid, `Error getting names: ${error}`);
                throw error;
            }

        }
        finally {
            if (client) client.close();
        }

    }

    parseRequest(req: Request): GetNamesRequest {
        return {};
    }

}