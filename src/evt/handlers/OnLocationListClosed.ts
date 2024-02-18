import { AEventHandler, EventHandlingResult } from "../EventHanlder";
import { TotoEvent } from "../TotoEvent";
import { HandledEvents } from "../EventHandlerHook";
import { ArchiveLocationListProcess } from "../../process/ArchiveLocationListProcess";
import { DeleteAllLocationListsProcess } from "../../process/DeleteAllLocationListsProcess";
import { DeleteMainSupermarketListProcess } from "../../process/DeleteMainSupermarketListProcess";
import { AddItemToListProcess } from "../../process/AddItemToListProcess";
import { MongoTransaction, Process } from "../../util/MongoTransaction";
import { Db } from "mongodb";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { LocationListItem } from "../../model/LocationListItem";

export class OnLocationListClosed extends AEventHandler {

    async handleEvent(msg: TotoEvent): Promise<EventHandlingResult> {

        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        // Only care about one event: location-list-closed
        if (msg.type != HandledEvents.locationListClosed) return {}

        // Extract data
        const supermarketId = msg.id;
        let untickedItems = msg.data && msg.data.untickedItems ? msg.data.untickedItems : null;

        logger.compute(cid, `Event [${msg.type}] received. Supermarket [${supermarketId}] Location List has been closed.`)

        // Instantiate the process
        const process = new OnLocationListClosedProcess(this.execContext, supermarketId, untickedItems)

        // Run the process
        const result = await new MongoTransaction<EventHandlingResult>(this.execContext).execute(process);

        logger.compute(cid, `Event [${msg.type}] successfully handled.`)

        return result;
    }
}

class OnLocationListClosedProcess extends Process<EventHandlingResult> {

    execContext: ExecutionContext;
    supermarketId: string;
    untickedItems: LocationListItem[] | undefined;

    constructor(execContext: ExecutionContext, supermarketId: string, untickedItems?: LocationListItem[]) {
        super();
        this.execContext = execContext;
        this.supermarketId = supermarketId;
        this.untickedItems = untickedItems;
    }

    async do(db: Db): Promise<EventHandlingResult> {

        // 1. Copy the closed location list to an archive
        await new ArchiveLocationListProcess(this.execContext, this.supermarketId).do(db);

        // 2. Delete all the Locations Lists
        await new DeleteAllLocationListsProcess(this.execContext).do(db);

        // 3. Delete all items in the Main Supermarket List
        await new DeleteMainSupermarketListProcess(this.execContext).do(db);

        // 4. If there are unticked items left, copy them back into the main list
        if (this.untickedItems && this.untickedItems.length > 0) {

            for (const untickedItem of this.untickedItems) {

                await new AddItemToListProcess(this.execContext, untickedItem).do(db)
            }
        }

        return { eventProcessed: true }
    }

}