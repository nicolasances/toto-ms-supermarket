import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ListItem } from "../model/ListItem";
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
import { extractTokenFromHeader } from "../util/TokenExtract";

interface CloseShoppingListRequest extends TotoRequest {
    sid: string;
    token: string;
}

interface CloseShoppingListResponse {
    untickedItems: LocationListItem[];
}

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
export class CloseShoppingList extends TotoDelegate<CloseShoppingListRequest, CloseShoppingListResponse> {

    async do(req: CloseShoppingListRequest, userContext?: UserContext): Promise<CloseShoppingListResponse> {

        const config = this.config as ControllerConfig;

        const supermarketId = req.sid;

        const result = await new MongoTransaction<LocationListItem[]>(config, this.cid!).execute(
            new CloseShoppingListProcess(req.token, config, this.cid!, supermarketId)
        );

        return { untickedItems: result }

    }

    parseRequest(req: Request): CloseShoppingListRequest {
        return {
            sid: req.params.sid,
            token: extractTokenFromHeader(req.headers)!
        };
    }

}

class CloseShoppingListProcess extends Process<LocationListItem[]> {

    config: ControllerConfig;
    cid: string;
    supermarketId: string;
    authToken: string;

    constructor(authToken: string, config: ControllerConfig, cid: string, supermarketId: string) {
        super();
        this.config = config;
        this.cid = cid;
        this.supermarketId = supermarketId;
        this.authToken = authToken;
    }

    async do(db: Db): Promise<LocationListItem[]> {

        // Stores
        const supermarketStore = new SupermarketStore();
        const llstore = new LocationListStore(db, this.cid, this.config);

        // Get the supermarket
        const supermarket = await supermarketStore.getSupermarket(this.supermarketId);

        // 1. Extract unticked items and cache them 
        const untickedItems = await llstore.getUntickedItems(supermarket);

        // 2. Delete unticked items from the Location Lists
        await llstore.deleteUntickedItems();

        // 3. Shopping List is closed: 
        await new EventPublisher(this.config, this.cid, 'supermarket').publishEvent(this.supermarketId, `location-list-closed`, `A Location List has been closed.`, { untickedItems: untickedItems, authToken: this.authToken })

        return untickedItems;

    }

}