import { DeleteItemFromLocationLists } from "../../process/DeleteItemFromLocationLists";
import { Logger, ProcessingResponse, TotoMessage, TotoMessageHandler } from "totoms";
import { ControllerConfig } from "../../Config";

export class OnItemDeleted extends TotoMessageHandler {

    protected handledMessageType: string = "itemDeleted";

    async onMessage(msg: TotoMessage): Promise<ProcessingResponse> {

        const logger = Logger.getInstance();
        const cid = msg.cid ?? this.cid;
        const config = this.config as ControllerConfig;

        // Extract data
        const itemId = msg.id;

        logger.compute(cid, `Event [${msg.type}] received. Item [${itemId}] has been deleted.`)

        await new DeleteItemFromLocationLists(config, cid).do(itemId);

        logger.compute(cid, `Event [${msg.type}] successfully handled.`)

        return { status: "processed", responsePayload: { eventProcessed: true } }
    }
}