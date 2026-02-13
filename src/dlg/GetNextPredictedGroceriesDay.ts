import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";

interface GetNextPredictedGroceriesDayRequest extends TotoRequest {
}

interface GetNextPredictedGroceriesDayResponse {
    predictedDays: number;
}

/**
 * Uses the 'nesu' model to predict the next expected day for groceries. 
 * 
 * The nesu model is predicting a number of days from today, that could vary from 0 to x (there's no real upper bound). 
 */
export class GetNextPredictedGroceriesDay extends TotoDelegate<GetNextPredictedGroceriesDayRequest, GetNextPredictedGroceriesDayResponse> {

    async do(req: GetNextPredictedGroceriesDayRequest, userContext?: UserContext): Promise<GetNextPredictedGroceriesDayResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        let client;

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());
            client = await config.getMongoClient(config.getDBName());

            return { predictedDays: 2 }

        } catch (error) {

            if (error instanceof ValidationError) {
                throw error;
            }
            else {
                logger.compute(this.cid, `Error getting next predicted day: ${error}`);
                throw error;
            }

        }
        finally {
            if (client) client.close();
        }

    }

    parseRequest(req: Request): GetNextPredictedGroceriesDayRequest {
        return {};
    }

}