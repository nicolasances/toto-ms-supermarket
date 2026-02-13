import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { LocationListStore } from "../store/LocationListStore";
import { DEFAULT_USER_INDEX, LocationListItem } from "../model/LocationListItem";
import { Supermarket } from "../model/Supermarket";
import { SupermarketStore } from "../store/SupermarketStore";
import { countTickedItems, determineUserIndex } from "../util/LocationListUtils";
import { EventPublisher } from "../evt/EventPublisher";

interface TickLocationItemRequest extends TotoRequest {
    sid: string;
    id: string;
    ticked: boolean;
}

interface TickLocationItemResponse {
    ticked: boolean;
    assignedUserIndex: number;
    [key: string]: any;
}

/**
 * Ticking (or unticking) a location item does mainly two things: 
 * 
 * 1. Updates the item in the location list
 * 
 * 2. Updates the userIndex of the item. 
 * Remember that the userIndex is the index that the user gives the item within the location list. 
 * It is tracked to provide a training base for the Supermarket ML "Item Index Model". 
 * 
 */
export class TickLocationItem extends TotoDelegate<TickLocationItemRequest, TickLocationItemResponse> {

    async do(req: TickLocationItemRequest, userContext?: UserContext): Promise<TickLocationItemResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        const supermarketId = req.sid;
        const itemId = req.id;
        const ticked = req.ticked;

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());

            // Create the stores
            const supermarketStore = new SupermarketStore();
            const store = new LocationListStore(db, this.cid!, config);

            // Retrieve the supermarket
            const supermarket = await supermarketStore.getSupermarket(supermarketId);

            // Retrieve all the items in the list
            const items = await store.getLocationListItems(supermarket);

            // Determine the user index of the item based on its "ticked" status
            const assignedUserIndex = determineUserIndex(items, ticked);

            // Update the items' ticked and userIndex attributes
            const updateResult = await store.updateTick(itemId, assignedUserIndex, ticked);

            // Count how many items have been ticked
            // If all the items of the list have NOW been ticked, publish an event
            if (ticked === true && countTickedItems(items) == items.length - 1) {

                await new EventPublisher(config, this.cid!, 'supermarket').publishEvent(supermarketId, `location-list-closed`, `A Location List has been closed.`)
            }

            return { ...updateResult, ticked: ticked, assignedUserIndex: assignedUserIndex };

        } catch (error) {

            if (error instanceof ValidationError) {
                throw error;
            }
            else {
                logger.compute(this.cid, `Error ticking location item: ${error}`);
                throw error;
            }

        }

    }

    parseRequest(req: Request): TickLocationItemRequest {
        const ticked = req.body.ticked;
        if (ticked == null) throw new ValidationError(400, `No ticked property provided`)

        return {
            sid: req.params.sid,
            id: req.params.id,
            ticked: ticked
        };
    }

}