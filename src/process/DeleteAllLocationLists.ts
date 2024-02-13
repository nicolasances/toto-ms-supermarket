import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { ControllerConfig } from "../Config";
import { LocationListStore } from "../store/LocationListStore";

export class DeleteAllLocationLists {

    execContext: ExecutionContext;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
    }

    async do() {


        const config = this.execContext.config as ControllerConfig
        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        let client;

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            // Instantiate stores
            const locationListStore = new LocationListStore(db, this.execContext);

            logger.compute(cid, `Deleting all Location Lists.`)

            // Delete all Location Lists
            await locationListStore.deleteAllLocationLists()

            // Done
            logger.compute(cid, `All Location Lists deleted.`)

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