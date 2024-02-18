import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ListStore } from "../store/ListStore";
import { Db } from "mongodb";
import { Process } from "../util/MongoTransaction";


export class DeleteMainSupermarketListProcess extends Process<void> {

    execContext: ExecutionContext;

    constructor(execContext: ExecutionContext) {
        super();
        this.execContext = execContext;
    }

    async do(db: Db) {

        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        // Instantiate stores
        const store = new ListStore(db, this.execContext);

        logger.compute(cid, `Deleting all items in the Main List.`)

        // Delete all Location Lists
        await store.deleteAllItems();

        // Done
        logger.compute(cid, `All items in the Main Supermarket List deleted.`)

    }
}