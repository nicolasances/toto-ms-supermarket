import { Request } from "express";
import { MessageDestination, TotoDelegate, TotoMessage, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import moment from "moment-timezone";

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
            const timestamp = moment().tz('Europe/Rome').format('YYYY.MM.DD HH:mm:ss');
            const message: TotoMessage = {
                timestamp: timestamp,
                cid: this.cid!,
                id: itemId,
                type: "itemDeleted",
                msg: `Item [${itemId}] delete from the main Supermarket List`,
                data: undefined
            };

            await this.messageBus.publishMessage(new MessageDestination({ topic: "supermarket" }), message)
            
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