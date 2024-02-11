import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ListItem } from "../model/ListItem";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { ControllerConfig } from "../Config";
import { SupermarketStore } from "../store/SupermarketStore";
import { MongoClient } from "mongodb";
import { LocationListStore } from "../store/LocationListStore";
import { LocationListItem } from "../model/LocationListItem";
import { SupermarketMLModel } from "../api/SupermarketMLModel";

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

    execContext: ExecutionContext;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
    }

    async do(item: ListItem) {

        const config = this.execContext.config as ControllerConfig
        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        let client;

        logger.compute(cid, `Adding list item [${item}] to Location Lists and re-sorting.`)

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            const locationListStore = new LocationListStore(db, this.execContext);
            const supermarketMLModel = new SupermarketMLModel(this.execContext);

            // 1. Get all the supermarkets (locations)
            const { supermarkets } = new SupermarketStore().getSupermarkets()

            // 2. For each Location List, add & sort
            for (const supermarket of supermarkets) {

                logger.compute(cid, `Adding item to supermarket [${JSON.stringify(supermarket)}]`)

                // 2.1. Get the currenct Location List
                const llitems = await locationListStore.getLocationListItems(supermarket);

                // 2.2. If the list is empty, there's no sorting to do: just add the item and continue to the next list
                if (llitems.length == 0) {

                    logger.compute(cid, `Item is the first of the Location List for supermarket [${supermarket.name}]`)

                    locationListStore.addLocationListItem(LocationListItem.fromListItem(item, supermarket));

                }
                // 2.3. If the list is NOT empty, then you need to Sort, Add & Save
                else {

                    // Sort
                    // TODO: this will return a sorted list that just needs to be saved
                    const predictedIndex = await supermarketMLModel.predictItemPosition(item, llitems)

                    logger.compute(cid, `Item is position at predicted index [${predictedIndex}]`)

                    // Add & Save
                    locationListStore.addLocationListItem(LocationListItem.fromListItem(item, supermarket, predictedIndex))

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
        finally {
            if (client) client.close();
        }
    }

}