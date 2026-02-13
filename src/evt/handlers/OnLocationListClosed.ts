import { AEventHandler, EventHandlingResult } from "../EventHanlder";
import { TotoEvent } from "../TotoEvent";
import { HandledEvents } from "../EventHandlerHook";
import { ArchiveLocationListProcess } from "../../process/ArchiveLocationListProcess";
import { DeleteAllLocationListsProcess } from "../../process/DeleteAllLocationListsProcess";
import { DeleteMainSupermarketListProcess } from "../../process/DeleteMainSupermarketListProcess";
import { AddItemToListProcess } from "../../process/AddItemToListProcess";
import { MongoTransaction, Process } from "../../util/MongoTransaction";
import { Db } from "mongodb";
import { Logger } from "totoms";
import { LocationListItem } from "../../model/LocationListItem";

export class OnLocationListClosed extends AEventHandler {

    async handleEvent(msg: TotoEvent): Promise<EventHandlingResult> {

        const logger = Logger.getInstance();
        const cid = this.cid;

        // Only care about one event: location-list-closed
        if (msg.type != HandledEvents.locationListClosed) return {}

        // Extract data
        const supermarketId = msg.id;
        let untickedItems = msg.data && msg.data.untickedItems ? msg.data.untickedItems : null;
        const authToken = msg.data && msg.data.authToken

        logger.compute(cid, `Event [${msg.type}] received. Supermarket [${supermarketId}] Location List has been closed. Unticked items: [${JSON.stringify(untickedItems ?? {})}]`)

        // Instantiate the process
        const process = new OnLocationListClosedProcess(authToken, this.config, this.cid, supermarketId, untickedItems)

        // Run the process
        const result = await new MongoTransaction<EventHandlingResult>(this.config, this.cid).execute(process);

        logger.compute(cid, `Event [${msg.type}] successfully handled.`)

        return result;
    }
}

class OnLocationListClosedProcess extends Process<EventHandlingResult> {

    config: any;
    cid: string;
    supermarketId: string;
    untickedItems: LocationListItem[] | undefined;
    authToken: string;

    constructor(authToken: string, config: any, cid: string, supermarketId: string, untickedItems?: LocationListItem[]) {
        super();
        this.config = config;
        this.cid = cid;
        this.supermarketId = supermarketId;
        this.untickedItems = untickedItems;
        this.authToken = authToken;
    }

    async do(db: Db): Promise<EventHandlingResult> {

        // 1. Copy the closed location list to an archive
        await new ArchiveLocationListProcess(this.config, this.cid, this.supermarketId).do(db);

        // 2. Delete all the Locations Lists
        await new DeleteAllLocationListsProcess(this.config, this.cid).do(db);

        // 3. Delete all items in the Main Supermarket List
        await new DeleteMainSupermarketListProcess(this.config, this.cid).do(db);

        // 4. If there are unticked items left, copy them back into the main list
        if (this.untickedItems && this.untickedItems.length > 0) {

            for (const untickedItem of this.untickedItems) {

                await new AddItemToListProcess(this.authToken, this.config, this.cid, untickedItem).do(db)
            }
        }

        return { eventProcessed: true }
    }

}