import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { ListItem } from "../model/ListItem";
import { AddItemToListProcess } from "../process/AddItemToListProcess";
import { MongoTransaction } from "../util/MongoTransaction";
import { extractTokenFromHeader } from "../util/TokenExtract";

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
        const addItemProcess = new AddItemToListProcess(req.token, config, this.cid!, item);

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