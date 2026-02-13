import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";

interface UpdateItemRequest extends TotoRequest {
    id: string;
    item: ListItem;
}

interface UpdateItemResponse {
    updated: boolean;
}

export class UpdateItem extends TotoDelegate<UpdateItemRequest, UpdateItemResponse> {

    async do(req: UpdateItemRequest, userContext?: UserContext): Promise<UpdateItemResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        const itemId = req.id;

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());

            // Create the store
            const store = new ListStore(db, this.cid!, config);

            // Save the item
            await store.updateItem(itemId, req.item);

            return { updated: true }

        } catch (error) {

            if (error instanceof ValidationError) {
                throw error;
            }
            else {
                logger.compute(this.cid, `Error updating item: ${error}`);
                throw error;
            }

        }

    }

    parseRequest(req: Request): UpdateItemRequest {
        return {
            id: req.params.id,
            item: ListItem.fromTransferObject(req.body)
        };
    }

}