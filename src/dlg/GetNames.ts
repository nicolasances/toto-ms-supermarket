import { Request } from "express";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from 'toto-api-controller/dist/model/TotoRuntimeError'
import { EventPublisher } from "../evt/EventPublisher";
import { ArchivedListStore } from "../store/ArchivedListStore";

/**
 * Gets the item names from all archived lists. 
 * 
 * This is a method that would be mostly used for 
 *  - Autocomplete on the front-end
 *  - Creating a dictionnary of terms for ML training
 * 
 */
export class GetNames implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const config = execContext.config as ControllerConfig

        let client;

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            // Create the store
            const store = new ArchivedListStore(db, execContext);

            // Get the names
            const names = store.getDistinctItemNames(300);

            return { names: names }


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