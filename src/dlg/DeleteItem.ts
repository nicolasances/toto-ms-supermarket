import { Request } from "express";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ControllerConfig } from "../Config";
import { ListStore } from "../store/ListStore";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from 'toto-api-controller/dist/model/TotoRuntimeError'
import { EventPublisher } from "../evt/EventPublisher";

export class DeleteItem implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const config = execContext.config as ControllerConfig

        const itemId = req.params.id;

        let client;

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            // Create the store
            const store = new ListStore(db, execContext);

            // Delete the item
            await store.deleteItem(itemId);

            // Publish the event on PubSub
            await new EventPublisher(execContext, "supermarket").publishEvent(itemId, "item-deleted", `Item [${itemId}] delete from the main Supermarket List`)
            
            return { deleted: true }

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