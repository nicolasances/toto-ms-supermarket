import { Request } from "express";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { MongoTransaction, Process } from "../../util/MongoTransaction";
import { Db } from "mongodb";
import { ControllerConfig } from "../../Config";
import { TrainingExample } from "../../model/games/TrainingExample";

/**
 * Saves an example that Toto Suppie can learn from. 
 * 
 * An example is represented by two items and the chosen shopping order between those two items.
 * It is saved so that Toto can save from it.
 * 
 */
export class SaveExample implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const example = TrainingExample.fromHttpRequest(req);

        const result = await new MongoTransaction<{ insertedId: string }>(execContext).execute(
            new SaveExampleProcess(execContext, example)
        );

        return { id: result.insertedId }

    }

}

class SaveExampleProcess implements Process<{ insertedId: string }> {

    execContext: ExecutionContext;
    example: TrainingExample;

    constructor(execContext: ExecutionContext, example: TrainingExample) {
        this.execContext = execContext;
        this.example = example;
    }

    async do(db: Db): Promise<{ insertedId: string; }> {

        const config = this.execContext.config as ControllerConfig;

        const { insertedId } = await db.collection(config.getCollections().trainingExamples).insertOne(this.example)

        return { insertedId: insertedId.toHexString() }

    }

}