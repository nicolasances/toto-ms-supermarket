import { TotoControllerConfig } from "../../model/TotoControllerConfig";
import { AgentManifest } from "../model/AgentManifest";

export abstract class GaleAgent {

    constructor(protected config: TotoControllerConfig) { }

    abstract getManifest(): AgentManifest;

}