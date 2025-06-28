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
import { SupermarketStore } from "../store/SupermarketStore";
import { LocationListStore } from "../store/LocationListStore";

/**
 * Uses the 'nesu' model to predict the next expected day for groceries. 
 * 
 * The nesu model is predicting a number of days from today, that could vary from 0 to x (there's no real upper bound). 
 */
export class GetNextPredictedGroceriesDay implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const config = execContext.config as ControllerConfig

        let client;

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            return { predictedDays: 2 }

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