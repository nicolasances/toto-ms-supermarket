import { Request } from "express";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ListItem } from "../model/ListItem";
import { AddItemToListProcess } from "../process/AddItemToListProcess";
import { MongoTransaction } from "../util/MongoTransaction";
import { extractTokenFromHeader } from "../util/TokenExtract";

export class AddItemToList implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        // Create the item
        const item = ListItem.fromTransferObject(req.body);

        execContext.logger.compute(execContext.cid, `Adding item to the supermarket list: ${item}`)

        // Create the process to execute
        const addItemProcess = new AddItemToListProcess(extractTokenFromHeader(req.headers)!, execContext, item);

        // Execute the process
        const { id } = await new MongoTransaction<{ id: string }>(execContext).execute(addItemProcess);

        // Return the item id
        return { id: id }

    }

}