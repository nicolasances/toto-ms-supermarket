import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { Db } from "mongodb";
import { Process } from "../util/MongoTransaction";
import { Logger } from "totoms";


export class DeleteMainSupermarketListProcess extends Process<void> {

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
        const store = new ListStore(db, this.cid, this.config);

        logger.compute(this.cid, `Deleting all items in the Main List.`)

        // Delete all Location Lists
        await store.deleteAllItems();

        // Done
        logger.compute(this.cid, `All items in the Main Supermarket List deleted.`)

    }
}