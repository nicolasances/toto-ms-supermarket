import { Document, WithId } from "mongodb"
import { Supermarket } from "./Supermarket"
import { ListItem } from "./ListItem"
import { F_INDEX, F_NAME, F_SUP_LOCATION, F_SUP_NAME } from "../store/LocationListStore"


export class LocationListItem {

    id?: string
    name: string
    supermarketName: string
    supermarketLocation: string
    index: number

    constructor(name: string, index: number, supermarket: Supermarket) {

        this.name = name;
        this.index = index;
        this.supermarketName = supermarket.name;
        this.supermarketLocation = supermarket.location;

    }

    static fromPersistentBson(bson: WithId<Document>) {

        const item = new LocationListItem(bson[F_NAME], bson[F_INDEX], new Supermarket(bson[F_SUP_NAME], bson[F_SUP_LOCATION]));
        item.id = bson._id.toHexString()

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