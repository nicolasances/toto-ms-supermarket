import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ControllerConfig } from "../Config";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { Db } from "mongodb";


export class MongoTransaction<T> {

    execContext: ExecutionContext;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
    }

    async execute(process: Process<T>): Promise<T> {

        const config = this.execContext.config as ControllerConfig

        let client;

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            // Execute the process
            return await process.do(db);

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

export abstract class Process<T> {

    abstract do(db: Db): Promise<T>

}