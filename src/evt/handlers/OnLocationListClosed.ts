import { AEventHandler, EventHandlingResult } from "../EventHanlder";
import { TotoEvent } from "../TotoEvent";
import { HandledEvents } from "../EventHandlerHook";

export class OnLocationListClosed extends AEventHandler {

    async handleEvent(msg: TotoEvent): Promise<EventHandlingResult> {

        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        // Only care about one event: location-list-closed
        if (msg.type != HandledEvents.locationListClosed) return {}

        // Extract data
        const supermarketId = msg.id;
        const item = msg.data;

        logger.compute(cid, `Event [${msg.type}] received. Supermarket [${supermarketId}] Location List has been closed.`)

        logger.compute(cid, `Event [${msg.type}] successfully handled.`)

        return {}
    }
}