import { Request } from "express";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { MongoTransaction, Process } from "../../util/MongoTransaction";
import { Db } from "mongodb";
import { ControllerConfig } from "../../Config";
import { TrainingExample } from "../../model/games/TrainingExample";
import { ArchivedListStore } from "../../store/ArchivedListStore";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";

/**
 * Moves to the next round
 * 
 * A round is made of a training example to be labeled. 
 * The two items are taken randomly from the list of archived items
 * 
 */
export class NextRound implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<RoundData | {}> {

        const result = await new MongoTransaction<RoundData | null>(execContext).execute(
            new NextRoundProcess(execContext)
        );

        if (!result) return {}

        return result;

    }

}

class NextRoundProcess implements Process<RoundData | null> {

    execContext: ExecutionContext;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
    }

    async do(db: Db): Promise<RoundData | null> {

        // Sample 2 random items from the archived lists
        const items = await new ArchivedListStore(db, this.execContext).sampleRandomItems(2)

        // Check that there were two samples
        if (items.length != 2) {
            this.execContext.logger.compute(this.execContext.cid, `Extraction of 2 samples from archivedLists collections failed. Extracted [${items.length}] items.`, "error");
            return null;
        }

        // Return the training example constructed from those two samples
        return { item1: items[0].name, item2: items[1].name };
    }

}

interface RoundData {
    item1: string,
    item2: string,
}