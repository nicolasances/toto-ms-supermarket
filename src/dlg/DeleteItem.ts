import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { EventPublisher } from "../evt/EventPublisher";

interface DeleteItemRequest extends TotoRequest {
    id: string;
}

interface DeleteItemResponse {
    deleted: boolean;
}

export class DeleteItem extends TotoDelegate<DeleteItemRequest, DeleteItemResponse> {

    async do(req: DeleteItemRequest, userContext?: UserContext): Promise<DeleteItemResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        const itemId = req.id;

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());

            // Create the store
            const store = new ListStore(db, this.cid!, config);

            // Delete the item
            await store.deleteItem(itemId);

            // Publish the event on PubSub
            await new EventPublisher(config, this.cid!, "supermarket").publishEvent(itemId, "item-deleted", `Item [${itemId}] delete from the main Supermarket List`)
            
            return { deleted: true }

        } catch (error) {

            if (error instanceof ValidationError) {
                throw error;
            }
            else {
                logger.compute(this.cid, `Error deleting item: ${error}`);
                throw error;
            }

        }

    }

    parseRequest(req: Request): DeleteItemRequest {
        return {
            id: req.params.id
        };
    }

}