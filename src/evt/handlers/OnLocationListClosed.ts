import { AEventHandler, EventHandlingResult } from "../EventHanlder";
import { TotoEvent } from "../TotoEvent";
import { HandledEvents } from "../EventHandlerHook";
import { ArchiveLocationList } from "../../process/ArchiveLocationList";
import { DeleteAllLocationLists } from "../../process/DeleteAllLocationLists";
import { DeleteMainSupermarketList } from "../../process/DeleteMainSupermarketList";

export class OnLocationListClosed extends AEventHandler {

    async handleEvent(msg: TotoEvent): Promise<EventHandlingResult> {

        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        // Only care about one event: location-list-closed
        if (msg.type != HandledEvents.locationListClosed) return {}

        // Extract data
        const supermarketId = msg.id;

        logger.compute(cid, `Event [${msg.type}] received. Supermarket [${supermarketId}] Location List has been closed.`)

        // 1. Copy the closed location list to an archive
        await new ArchiveLocationList(this.execContext).do(supermarketId);

        // 2. Delete all the Locations Lists
        await new DeleteAllLocationLists(this.execContext).do();

        // 3. Delete all items in the Main Supermarket List
        await new DeleteMainSupermarketList(this.execContext).do();

        logger.compute(cid, `Event [${msg.type}] successfully handled.`)

        return { eventProcessed: true }
    }
}