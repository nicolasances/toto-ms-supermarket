import { Request } from "express";
import { MessageDestination, TotoDelegate, TotoMessage, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { ListItem } from "../model/ListItem";
import { AddItemToListProcess } from "../process/AddItemToListProcess";
import { MongoTransaction } from "../util/MongoTransaction";
import { extractTokenFromHeader } from "../util/TokenExtract";
import moment from "moment-timezone";

interface AddItemToListRequest extends TotoRequest {
    item: ListItem;
    token: string;
}

interface AddItemToListResponse {
    id: string;
}

export class AddItemToList extends TotoDelegate<AddItemToListRequest, AddItemToListResponse> {

    async do(req: AddItemToListRequest, userContext?: UserContext): Promise<AddItemToListResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        const item = req.item;

        logger.compute(this.cid!, `Adding item to the supermarket list: ${item}`)

        // Create the process to execute
        const addItemProcess = new AddItemToListProcess(req.token, config, this.cid!, item, async (itemId, itemToPublish, authToken) => {
            const timestamp = moment().tz('Europe/Rome').format('YYYY.MM.DD HH:mm:ss');
            const message: TotoMessage = {
                timestamp: timestamp,
                cid: this.cid!,
                id: itemId,
                type: "itemAdded",
                msg: `Item [${itemToPublish.id}] added to the Supermarket List`,
                data: { item: itemToPublish, authToken: authToken }
            };

            await this.messageBus.publishMessage(new MessageDestination({ topic: "supermarket" }), message)
        });

        // Execute the process
        const { id } = await new MongoTransaction<{ id: string }>(config, this.cid!).execute(addItemProcess);

        // Return the item id
        return { id: id }

    }

    parseRequest(req: Request): AddItemToListRequest {
        return {
            item: ListItem.fromTransferObject(req.body),
            token: extractTokenFromHeader(req.headers)!
        };
    }

}