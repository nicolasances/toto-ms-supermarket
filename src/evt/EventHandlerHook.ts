import { Request } from "express";
import { TotoEvent } from "./TotoEvent";
import { AEventHandler } from "./EventHanlder";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { OnItemAdded } from "./handlers/OnItemAdded";
import { OnLocationListClosed } from "./handlers/OnLocationListClosed";

export class EventHandlerHook implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const logger = execContext.logger;
        const cid = execContext.cid;

        logger.compute(cid, `Received message from PubSub`);

        const HANDLERS: IIndexable = {

            [HandledEvents.itemAdded]: [new OnItemAdded(execContext)],
            [HandledEvents.locationListClosed]: [new OnLocationListClosed(execContext)]

        }

        const totoEvent = JSON.parse(String(Buffer.from(req.body.message.data, 'base64'))) as TotoEvent;

        // Find the right event handler 
        if (HANDLERS[totoEvent.type]) {

            for (const handler of HANDLERS[totoEvent.type]) {

                await handler.handleEvent(totoEvent);

            }

        }

        return { processed: true }

    }

}

export const HandledEvents = {
    itemAdded: "item-added",
    locationListClosed: 'location-list-closed',
}

export interface IIndexable {
    [key: string]: Array<AEventHandler>;
}
