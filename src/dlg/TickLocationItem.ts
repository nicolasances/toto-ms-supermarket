import { Request } from "express";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ControllerConfig } from "../Config";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from 'toto-api-controller/dist/model/TotoRuntimeError'
import { LocationListStore } from "../store/LocationListStore";
import { DEFAULT_USER_INDEX, LocationListItem } from "../model/LocationListItem";
import { Supermarket } from "../model/Supermarket";
import { SupermarketStore } from "../store/SupermarketStore";
import { countTickedItems, determineUserIndex } from "../util/LocationListUtils";
import { EventPublisher } from "../evt/EventPublisher";

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
export class TickLocationItem implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const config = execContext.config as ControllerConfig

        const supermarketId = req.params.sid;
        const itemId = req.params.id;
        const ticked = req.body.ticked;

        if (ticked == null) throw new ValidationError(400, `No ticked property provided`)

        let client;

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            // Create the stores
            const supermarketStore = new SupermarketStore();
            const store = new LocationListStore(db, execContext);

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

                await new EventPublisher(execContext, 'supermarket').publishEvent(supermarketId, `location-list-closed`, `A Location List has been closed.`)
            }

            return { ...updateResult, ticked: ticked, assignedUserIndex: assignedUserIndex };

        } catch (error) {

            if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                throw error;
            }
            else {
                console.log(error);
                throw error;
            }

        }
        finally {
            if (client) client.close();
        }

    }

}