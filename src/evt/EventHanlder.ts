import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoEvent } from "./TotoEvent";

export abstract class AEventHandler {
    
    execContext: ExecutionContext;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
    }

    abstract handleEvent(msg: TotoEvent): Promise<EventHandlingResult>
}

export class EventHandlingResult {
    
}