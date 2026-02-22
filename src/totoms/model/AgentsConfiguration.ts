import { TotoMessageBus } from "../evt/MessageBus";
import { GaleAgent } from "../gale/agent/GaleAgent";
import { TotoControllerConfig } from "./TotoControllerConfig";

export interface AgentsConfiguration {
    agents: (new (messageBus: TotoMessageBus, config: TotoControllerConfig) => GaleAgent<any, any>)[];
}
