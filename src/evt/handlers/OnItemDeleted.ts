import { ControllerConfig } from "../../Config";
import { AEventHandler, EventHandlingResult } from "../EventHanlder";
import { TotoEvent } from "../TotoEvent";
import { HandledEvents } from "../EventHandlerHook";
import { basicallyHandleError } from "../../util/ErrorUtil";
import { AddItemAndSortProcess } from "../../process/AddItemAndSortProcess";
import { DeleteItemFromLocationLists } from "../../process/DeleteItemFromLocationLists";

export class OnItemDeleted extends AEventHandler {

    async handleEvent(msg: TotoEvent): Promise<EventHandlingResult> {

        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        // Only care about one event: item-added 
        if (msg.type != HandledEvents.itemDeleted) return {}

        // Extract data
        const itemId = msg.id;

        logger.compute(cid, `Event [${msg.type}] received. Item [${itemId}] has been deleted.`)

        await new DeleteItemFromLocationLists(this.execContext).do(itemId);

        logger.compute(cid, `Event [${msg.type}] successfully handled.`)

        return { eventProcessed: true }
    }
}