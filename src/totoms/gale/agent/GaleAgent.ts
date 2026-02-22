import { TotoDelegate } from "../../model/TotoDelegate";
import { AgentManifest } from "../model/AgentManifest";
import { TotoRequest } from "../../model/TotoRequest";

export abstract class GaleAgent<I extends TotoRequest, O> extends TotoDelegate<I, O> {

    abstract getManifest(): AgentManifest;

}