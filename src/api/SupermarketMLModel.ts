import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ListItem } from "../model/ListItem";
import { LocationListItem } from "../model/LocationListItem";
import { Supermarket } from "../model/Supermarket";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";

export class SupermarketMLModel {

    execContext: ExecutionContext;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
    }

    /**
     * Predicts the position of the specified item within the Location List
     * 
     * @param item the item for which the position needs to be predicted
     * @param locationList the location list the item will be added to
     * 
     * @returns a Promise with a number (predicted position index)
     */
    async predictItemPosition(item: ListItem, locationList: LocationListItem[]): Promise<number> {

        if (locationList.length == 0) return 0

        // TODO

        return locationList.length;

    }
}