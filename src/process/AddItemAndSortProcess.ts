import { ListItem } from "../model/ListItem";
import { ValidationError, TotoRuntimeError } from "totoms";
import { ControllerConfig } from "../Config";
import { SupermarketStore } from "../store/SupermarketStore";
import { MongoClient } from "mongodb";
import { LocationListStore } from "../store/LocationListStore";
import { LocationListItem } from "../model/LocationListItem";
import { SupermarketMLModel } from "../api/SupermarketMLModel";
import { Logger } from "totoms";

/**
 * This process takes a new item that has been added to the "main" list and adds it to the Location Lists, 
 * resorting them.
 * 
 * The steps that the process follows, for each Location List, are the following: 
 * 
 * 1. Call the Supermarket ML Model (toto-ml-supermarket), passing the new item and the previously sorted Location list
 * and get the sorted list resulting of adding that element to the list and resorting.
 * 
 * 2. Update the list on DB
 * 
 */
export class AddItemAndSortProcess {

    config: ControllerConfig;
    cid: string;
    token: string;

    constructor(token: string, config: ControllerConfig, cid: string) {
        this.config = config;
        this.cid = cid;
        this.token = token
    }

    async do(item: ListItem) {

        const logger = Logger.getInstance();

        logger.compute(this.cid, `Adding list item [${JSON.stringify(item)}] to Location Lists and re-sorting.`)

        try {

            // Instantiate the DB
            const db = await this.config.getMongoDb(this.config.getDBName());

            const locationListStore = new LocationListStore(db, this.cid, this.config);
            const supermarketMLModel = new SupermarketMLModel(this.token, this.config, this.cid);

            // 1. Get all the supermarkets (locations)
            const { supermarkets } = new SupermarketStore().getSupermarkets()

            // 2. For each Location List, add & sort
            for (const supermarket of supermarkets) {

                logger.compute(this.cid, `Adding item to supermarket [${JSON.stringify(supermarket)}]`)

                // 2.1. Get the currenct Location List
                const llitems = await locationListStore.getLocationListItems(supermarket);

                // 2.2. If the list is empty, there's no sorting to do: just add the item and continue to the next list
                if (llitems.length == 0) {

                    logger.compute(this.cid, `Item is the first of the Location List for supermarket [${supermarket.name}]`)

                    await locationListStore.addLocationListItem(LocationListItem.fromListItem(item, supermarket));

                }
                // 2.3. If the list is NOT empty, then you need to Sort, Add & Save
                else {

                    // Sort
                    // TODO: this will return a sorted list that just needs to be saved
                    const predictedIndex = await supermarketMLModel.predictItemPosition(item, llitems)

                    logger.compute(this.cid, `Item is positionned at predicted index [${predictedIndex}]`)

                    // Add & Save
                    await locationListStore.addLocationListItem(LocationListItem.fromListItem(item, supermarket, predictedIndex))

                }

            }


        } catch (error) {

            if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                throw error;
            }
            else {
                console.log(error);
                throw error;
            }

        }
    }

}