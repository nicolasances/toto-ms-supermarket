import { Document, WithId } from "mongodb"
import { Supermarket } from "./Supermarket"
import { ListItem } from "./ListItem"
import { ValidationError } from "toto-api-controller/dist/validation/Validator"
import { LocationListItem } from "./LocationListItem"

export const DEFAULT_USER_INDEX = -1

export class ArchivedListItem {

    id?: string
    listId: string                  // This is a unique id that needs to be provided to distinguish items between a list and another
    name: string
    supermarketId: string
    supermarketName: string
    supermarketLocation: string
    userIndex: number               // This is the index that the user assigned to the item, by clicking on it

    constructor(listId: string, name: string, userIndex: number, supermarket: Supermarket) {

        this.name = name;
        this.supermarketId = supermarket.id!;
        this.supermarketName = supermarket.name;
        this.supermarketLocation = supermarket.location;
        this.userIndex = userIndex;
        this.listId = listId;

    }

    static fromLocationListItem(listId: string, item: LocationListItem, supermarket: Supermarket) {

        return new ArchivedListItem(listId, item.name, item.userIndex, supermarket);

    }


}