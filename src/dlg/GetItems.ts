import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";

interface GetItemsRequest extends TotoRequest {
}

interface GetItemsResponse {
    items: ListItem[];
}

export class GetItems extends TotoDelegate<GetItemsRequest, GetItemsResponse> {

    async do(req: GetItemsRequest, userContext?: UserContext): Promise<GetItemsResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());

            // Create the store
            const store = new ListStore(db, this.cid!, config);

            // Get the items
            const items = await store.getItems();

            return { items: items }

        } catch (error) {

            if (error instanceof ValidationError) {
                throw error;
            }
            else {
                logger.compute(this.cid, `Error getting items: ${error}`);
                throw error;
            }

        }

    }

    parseRequest(req: Request): GetItemsRequest {
        return {};
    }

}