import { Request } from "express";
import { TotoEvent } from "./TotoEvent";
import { AEventHandler } from "./EventHanlder";
import { TotoDelegate, UserContext, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { OnItemAdded } from "./handlers/OnItemAdded";
import { OnLocationListClosed } from "./handlers/OnLocationListClosed";
import { OnItemDeleted } from "./handlers/OnItemDeleted";

interface EventHandlerRequest extends TotoRequest {
    message: {
        data: string;
    };
}

interface EventHandlerResponse {
    processed: boolean;
}

export class EventHandlerHook extends TotoDelegate<EventHandlerRequest, EventHandlerResponse> {

    async do(req: EventHandlerRequest, userContext?: UserContext): Promise<EventHandlerResponse> {

        const logger = Logger.getInstance();
        const cid = this.cid;
        const config = this.config as ControllerConfig;

        logger.compute(cid, `Received message from PubSub`);

        const HANDLERS: IIndexable = {

            [HandledEvents.itemAdded]: [new OnItemAdded(config, cid!)],
            [HandledEvents.itemDeleted]: [new OnItemDeleted(config, cid!)],
            [HandledEvents.locationListClosed]: [new OnLocationListClosed(config, cid!)],

        }

        const totoEvent = JSON.parse(String(Buffer.from(req.message.data, 'base64'))) as TotoEvent;

        // Find the right event handler 
        if (HANDLERS[totoEvent.type]) {

            for (const handler of HANDLERS[totoEvent.type]) {

                await handler.handleEvent(totoEvent);

            }

        }

        return { processed: true }

    }

    parseRequest(req: Request): EventHandlerRequest {
        return {
            message: req.body.message
        };
    }

}

export const HandledEvents = {
    itemAdded: "item-added",
    itemDeleted: "item-deleted",
    locationListClosed: 'location-list-closed',
}

export interface IIndexable {
    [key: string]: Array<AEventHandler>;
}
