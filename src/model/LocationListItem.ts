import { Document, WithId } from "mongodb"
import { Supermarket } from "./Supermarket"
import { ListItem } from "./ListItem"
import { F_INDEX, F_NAME, F_SUP_LOCATION, F_SUP_NAME } from "../store/LocationListStore"
import { ValidationError } from "toto-api-controller/dist/validation/Validator"


export class LocationListItem {

    id?: string
    name: string
    supermarketName: string
    supermarketLocation: string
    index: number
    ticked: boolean

    constructor(name: string, index: number, supermarket: Supermarket) {

        this.name = name;
        this.index = index;
        this.supermarketName = supermarket.name;
        this.supermarketLocation = supermarket.location;
        this.ticked = false

    }

    static fromPersistentBson(bson: WithId<Document>) {

        const item = new LocationListItem(bson[F_NAME], bson[F_INDEX], new Supermarket(bson[F_SUP_NAME], bson[F_SUP_LOCATION]));
        item.id = bson._id.toHexString()
        item.ticked = bson.ticked

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
        const item = new LocationListItem(httpBody.name, httpBody.index, httpBody.supermarket)
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

        return new LocationListItem(listItem.name, index ?? 0, supermarket)

    }

}