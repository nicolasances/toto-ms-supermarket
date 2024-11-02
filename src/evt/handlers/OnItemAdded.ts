import { AEventHandler, EventHandlingResult } from "../EventHanlder";
import { TotoEvent } from "../TotoEvent";
import { HandledEvents } from "../EventHandlerHook";
import { AddItemAndSortProcess } from "../../process/AddItemAndSortProcess";

export class OnItemAdded extends AEventHandler {

    async handleEvent(msg: TotoEvent): Promise<EventHandlingResult> {

        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        // Only care about one event: item-added 
        if (msg.type != HandledEvents.itemAdded) return {}

        // Extract data
        const itemId = msg.id;
        const item = msg.data.item;
        const token = msg.data.authToken;

        // Add the id to the item
        item.id = itemId

        logger.compute(cid, `Event [${msg.type}] received. Item [${itemId}] has been added. Item: [${JSON.stringify(item)}]`)

        await new AddItemAndSortProcess(token, this.execContext).do(item);

        logger.compute(cid, `Event [${msg.type}] successfully handled.`)

        return { eventProcessed: true }
    }
}