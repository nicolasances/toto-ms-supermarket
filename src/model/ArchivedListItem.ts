import { Document, WithId } from "mongodb"
import { Supermarket } from "./Supermarket"
import { ListItem } from "./ListItem"
import { ValidationError } from "toto-api-controller/dist/validation/Validator"
import { LocationListItem } from "./LocationListItem"
import { F_LIST_ID, F_NAME, F_SUP_ID, F_SUP_LOCATION, F_SUP_NAME, F_USER_INDEX } from "../store/ArchivedListStore"

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

    /**
     * Build the item from a persisted Mongo object
     * 
     * @param doc the stored BSON object 
     * @returns an ArchivedListItem
     */
    static fromPersistedObject(doc: Document) {

        return new ArchivedListItem(doc[F_LIST_ID], doc[F_NAME], doc[F_USER_INDEX], new Supermarket(doc[F_SUP_NAME], doc[F_SUP_LOCATION], doc[F_SUP_ID]))
    }

    static fromLocationListItem(listId: string, item: LocationListItem, supermarket: Supermarket) {

        return new ArchivedListItem(listId, item.name, item.userIndex, supermarket);

    }


}