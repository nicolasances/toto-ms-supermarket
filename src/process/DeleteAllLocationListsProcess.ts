import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { LocationListStore } from "../store/LocationListStore";
import { Process } from "../util/MongoTransaction";
import { Db } from "mongodb";

export class DeleteAllLocationListsProcess extends Process<void> {

    execContext: ExecutionContext;

    constructor(execContext: ExecutionContext) {
        super();
        this.execContext = execContext;
    }

    async do(db: Db) {

        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        // Instantiate stores
        const locationListStore = new LocationListStore(db, this.execContext);

        logger.compute(cid, `Deleting all Location Lists.`)

        // Delete all Location Lists
        await locationListStore.deleteAllLocationLists()

        // Done
        logger.compute(cid, `All Location Lists deleted.`)

    }
}