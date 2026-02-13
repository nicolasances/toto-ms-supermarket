import { Document, WithId } from "mongodb"
import { Supermarket } from "./Supermarket"
import { ListItem } from "./ListItem"
import { F_INDEX, F_ITEM_ID, F_NAME, F_SUP_LOCATION, F_SUP_NAME, F_TICKED, F_USER_INDEX } from "../store/LocationListStore"
import { ValidationError } from "totoms"

export const DEFAULT_USER_INDEX = -1

export class LocationListItem {

    id?: string
    itemId: string
    name: string
    supermarketName: string
    supermarketLocation: string
    index: number
    userIndex: number               // This is the index that the user assigned to the item, by clicking on it
    ticked: boolean

    constructor(name: string, index: number, supermarket: Supermarket, itemId: string) {

        this.name = name;
        this.index = index;
        this.supermarketName = supermarket.name;
        this.supermarketLocation = supermarket.location;
        this.ticked = false;
        this.userIndex = DEFAULT_USER_INDEX;
        this.itemId = itemId;

    }

    static fromPersistentBson(bson: WithId<Document>) {

        const item = new LocationListItem(bson[F_NAME], bson[F_INDEX], new Supermarket(bson[F_SUP_NAME], bson[F_SUP_LOCATION]), bson[F_ITEM_ID]);
        item.id = bson._id.toHexString();
        item.ticked = bson[F_TICKED];
        item.userIndex = bson[F_USER_INDEX];

        return item;
    }

    /**
     * Creates a Location List item from a request body
     * 
     * @param httpBody the HTTP body of the request
     * 
     * @returns the constructed Location List item
     */
    static fromTransferObject(httpBody: any) {

        // 1. Validate
        if (!httpBody.name) throw new ValidationError(400, `Missing item name`)
        if (!httpBody.index) throw new ValidationError(400, `Missing item index`)
        if (!httpBody.supermarket) throw new ValidationError(400, `Missing item's supermarket`)
        if (!httpBody.supermarket.name) throw new ValidationError(400, `Missing item's supermarket name`)
        if (!httpBody.supermarket.location) throw new ValidationError(400, `Missing item's supermarket location`)

        // 2. Build the item
        const item = new LocationListItem(httpBody.name, httpBody.index, httpBody.supermarket, httpBody.itemId)
        item.id = httpBody.id;
        item.ticked = httpBody.ticked;

        return item;

    }

    /**
     * Builds a location list item from a list item. 
     * This can be used when creating Location Lists out of the main Supermarket List
     * 
     * @param listItem a ListItem
     * @param supermarket the supermarket representing the location 
     */
    static fromListItem(listItem: ListItem, supermarket: Supermarket, index?: number) {

        return new LocationListItem(listItem.name, index ?? 0, supermarket, listItem.id!)

    }

}