import { ControllerConfig } from "../Config";
import { LocationListStore } from "../store/LocationListStore";
import { Process } from "../util/MongoTransaction";
import { Db } from "mongodb";
import { Logger } from "totoms";

export class DeleteAllLocationListsProcess extends Process<void> {

    config: ControllerConfig;
    cid: string;

    constructor(config: ControllerConfig, cid: string) {
        super();
        this.config = config;
        this.cid = cid;
    }

    async do(db: Db) {

        const logger = Logger.getInstance();

        // Instantiate stores
        const locationListStore = new LocationListStore(db, this.cid, this.config);

        logger.compute(this.cid, `Deleting all Location Lists.`)

        // Delete all Location Lists
        await locationListStore.deleteAllLocationLists()

        // Done
        logger.compute(this.cid, `All Location Lists deleted.`)

    }
}