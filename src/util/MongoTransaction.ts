import { ControllerConfig } from "../Config";
import { ValidationError } from "totoms";
import { Db } from "mongodb";


export class MongoTransaction<T> {

    config: ControllerConfig;
    cid: string;

    constructor(config: ControllerConfig, cid: string) {
        this.config = config;
        this.cid = cid;
    }

    async execute(process: Process<T>): Promise<T> {

        let client;

        try {

            // Instantiate the DB
            client = await this.config.getMongoClient(this.config.getDBName());
            const db = await this.config.getMongoDb(this.config.getDBName());

            // Execute the process
            return await process.do(db);

        } catch (error) {

            if (error instanceof ValidationError) {
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