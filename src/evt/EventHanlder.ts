import { ControllerConfig } from "../Config";
import { TotoEvent } from "./TotoEvent";

export abstract class AEventHandler {
    
    config: ControllerConfig;
    cid: string;

    constructor(config: ControllerConfig, cid: string) {
        this.config = config;
        this.cid = cid;
    }

    abstract handleEvent(msg: TotoEvent): Promise<EventHandlingResult>
}

export class EventHandlingResult {
    
}