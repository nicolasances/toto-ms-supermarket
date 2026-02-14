import { AddItemAndSortProcess } from "../../process/AddItemAndSortProcess";
import { Logger, ProcessingResponse, TotoMessage, TotoMessageHandler } from "totoms";
import { ControllerConfig } from "../../Config";

export class OnItemAdded extends TotoMessageHandler {

    protected handledMessageType: string = "itemAdded";

    async onMessage(msg: TotoMessage): Promise<ProcessingResponse> {

        const logger = Logger.getInstance();
        const cid = msg.cid ?? this.cid;

        // Extract data
        const itemId = msg.id;
        const item = msg.data.item;
        const token = msg.data.authToken;

        // Add the id to the item
        item.id = itemId

        logger.compute(cid, `Event [${msg.type}] received. Item [${itemId}] has been added. Item: [${JSON.stringify(item)}]`)

        await new AddItemAndSortProcess(token, this.config as ControllerConfig, cid).do(item);

        logger.compute(cid, `Event [${msg.type}] successfully handled.`)

        return { status: "processed", responsePayload: { eventProcessed: true } }
    }
}