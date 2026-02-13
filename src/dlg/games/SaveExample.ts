import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { MongoTransaction, Process } from "../../util/MongoTransaction";
import { Db } from "mongodb";
import { ControllerConfig } from "../../Config";
import { TrainingExample } from "../../model/games/TrainingExample";

interface SaveExampleRequest extends TotoRequest {
    example: TrainingExample;
}

interface SaveExampleResponse {
    id: string;
}

/**
 * Saves an example that Toto Suppie can learn from. 
 * 
 * An example is represented by two items and the chosen shopping order between those two items.
 * It is saved so that Toto can save from it.
 * 
 */
export class SaveExample extends TotoDelegate<SaveExampleRequest, SaveExampleResponse> {

    async do(req: SaveExampleRequest, userContext?: UserContext): Promise<SaveExampleResponse> {

        const config = this.config as ControllerConfig;

        const result = await new MongoTransaction<{ insertedId: string }>(config, this.cid!).execute(
            new SaveExampleProcess(config, this.cid!, req.example)
        );

        return { id: result.insertedId }

    }

    parseRequest(req: Request): SaveExampleRequest {
        return {
            example: TrainingExample.fromHttpRequest(req)
        };
    }

}

class SaveExampleProcess extends Process<{ insertedId: string }> {

    config: ControllerConfig;
    cid: string;
    example: TrainingExample;

    constructor(config: ControllerConfig, cid: string, example: TrainingExample) {
        super();
        this.config = config;
        this.cid = cid;
        this.example = example;
    }

    async do(db: Db): Promise<{ insertedId: string; }> {

        const { insertedId } = await db.collection(this.config.getCollections().trainingExamples).insertOne(this.example)

        return { insertedId: insertedId.toHexString() }

    }

}