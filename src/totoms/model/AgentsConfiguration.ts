import { GaleAgent } from "../gale/agent/GaleAgent";
import { TotoControllerConfig } from "./TotoControllerConfig";

export interface AgentsConfiguration {
    agents: (new (config: TotoControllerConfig) => GaleAgent)[];
}
