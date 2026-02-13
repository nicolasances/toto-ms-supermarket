import { AEventHandler, EventHandlingResult } from "../EventHanlder";
import { TotoEvent } from "../TotoEvent";
import { HandledEvents } from "../EventHandlerHook";
import { DeleteItemFromLocationLists } from "../../process/DeleteItemFromLocationLists";
import { Logger } from "totoms";

export class OnItemDeleted extends AEventHandler {

    async handleEvent(msg: TotoEvent): Promise<EventHandlingResult> {

        const logger = Logger.getInstance();
        const cid = this.cid;

        // Only care about one event: item-added 
        if (msg.type != HandledEvents.itemDeleted) return {}

        // Extract data
        const itemId = msg.id;

        logger.compute(cid, `Event [${msg.type}] received. Item [${itemId}] has been deleted.`)

        await new DeleteItemFromLocationLists(this.config, this.cid).do(itemId);

        logger.compute(cid, `Event [${msg.type}] successfully handled.`)

        return { eventProcessed: true }
    }
}