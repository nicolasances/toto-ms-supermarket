import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { MongoTransaction, Process } from "../../util/MongoTransaction";
import { Db } from "mongodb";
import { ControllerConfig } from "../../Config";
import { TrainingExample } from "../../model/games/TrainingExample";
import { ArchivedListStore } from "../../store/ArchivedListStore";

interface NextRoundRequest extends TotoRequest {
}

interface RoundData {
    item1: string,
    item2: string,
}

type NextRoundResponse = RoundData | Record<string, never>;

/**
 * Moves to the next round
 * 
 * A round is made of a training example to be labeled. 
 * The two items are taken randomly from the list of archived items
 * 
 */
export class NextRound extends TotoDelegate<NextRoundRequest, NextRoundResponse> {

    async do(req: NextRoundRequest, userContext?: UserContext): Promise<NextRoundResponse> {

        const config = this.config as ControllerConfig;

        const result = await new MongoTransaction<RoundData | null>(config, this.cid!).execute(
            new NextRoundProcess(config, this.cid!)
        );

        if (!result) return {}

        return result;

    }

    parseRequest(req: Request): NextRoundRequest {
        return {};
    }

}

class NextRoundProcess extends Process<RoundData | null> {

    config: ControllerConfig;
    cid: string;

    constructor(config: ControllerConfig, cid: string) {
        super();
        this.config = config;
        this.cid = cid;
    }

    async do(db: Db): Promise<RoundData | null> {

        const logger = Logger.getInstance();

        // Sample 2 random items from the archived lists
        const items = await new ArchivedListStore(db, this.cid, this.config).sampleRandomItems(2)

        // Check that there were two samples
        if (items.length != 2) {
            logger.compute(this.cid, `Extraction of 2 samples from archivedLists collections failed. Extracted [${items.length}] items.`, "error");
            return null;
        }

        // Return the training example constructed from those two samples
        return { item1: items[0].name, item2: items[1].name };
    }

}