import { ControllerConfig } from "../../Config";
import { AEventHandler, EventHandlingResult } from "../EventHanlder";
import { TotoEvent } from "../TotoEvent";
import { HandledEvents } from "../EventHandlerHook";
import { basicallyHandleError } from "../../util/ErrorUtil";
import { AddItemAndSortProcess } from "../../process/AddItemAndSortProcess";

export class OnItemAdded extends AEventHandler {

    async handleEvent(msg: TotoEvent): Promise<EventHandlingResult> {

        const config = this.execContext.config as ControllerConfig;
        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        // Only care about one event: item-added 
        if (msg.type != HandledEvents.itemAdded) return {}

        // Extract data
        const itemId = msg.id;
        const item = msg.data;

        logger.compute(cid, `Event [${msg.type}] received. Item [${itemId}] has been added. Item: [${JSON.stringify(item)}]`)

        await new AddItemAndSortProcess(this.execContext).do(item);

        logger.compute(cid, `Event [${msg.type}] successfully handled.`)

        return {}
    }
}