import { Request } from "express";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from 'toto-api-controller/dist/model/TotoRuntimeError'
import { EventPublisher } from "../evt/EventPublisher";
import { LocationListStore } from "../store/LocationListStore";
import { SupermarketStore } from "../store/SupermarketStore";
import { ArchiveLocationListProcess } from "../process/ArchiveLocationListProcess";
import { DeleteAllLocationListsProcess } from "../process/DeleteAllLocationListsProcess";
import { DeleteMainSupermarketListProcess } from "../process/DeleteMainSupermarketListProcess";
import { AddItemToList } from "./AddItemToList";
import { AddItemToListProcess } from "../process/AddItemToListProcess";
import { MongoTransaction, Process } from "../util/MongoTransaction";
import { Db } from "mongodb";
import { LocationListItem } from "../model/LocationListItem";

/**
 * Closing the shopping list is typically used when there are still items in the location list. 
 * 
 * What happens when a list is "prematurely" closed? 
 * The user expects the following: 
 *  - The shopping session is considered closed, and the items have been archived. 
 *  - The Main List has the remaining items. 
 * 
 * That means that when closing a list, the following needs to happen
 * 
 * 1. All unticked elements are saved in a temp list and deleted from the Location Lists. 
 * 
 * 2. Publish the event "Location List closed", that will take care of following the standard process for closing a list
 * 
 * 3. The unticked elements are passed to the "location-list-closed" event, to signal that they should be "re-added" to the main list
 * 
 */
export class CloseShoppingList implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const supermarketId = req.params.sid;

        new MongoTransaction<LocationListItem[]>(execContext).execute(
            new CloseShoppingListProcess(execContext, supermarketId)
        );

    }

}

class CloseShoppingListProcess extends Process<LocationListItem[]> {

    execContext: ExecutionContext;
    supermarketId: string;

    constructor(execContext: ExecutionContext, supermarketId: string) {
        super();
        this.execContext = execContext;
        this.supermarketId = supermarketId;
    }

    async do(db: Db): Promise<LocationListItem[]> {

        // Stores
        const supermarketStore = new SupermarketStore();
        const llstore = new LocationListStore(db, this.execContext);

        // Get the supermarket
        const supermarket = await supermarketStore.getSupermarket(this.supermarketId);

        // 1. Extract unticked items and cache them 
        const untickedItems = await llstore.getUntickedItems(supermarket);

        // 2. Delete unticked items from the Location Lists
        await llstore.deleteUntickedItems();

        // 3. Shopping List is closed: 
        await new EventPublisher(this.execContext, 'supermarket').publishEvent(this.supermarketId, `location-list-closed`, `A Location List has been closed.`, { untickedItems: untickedItems })

        return untickedItems;

    }

}