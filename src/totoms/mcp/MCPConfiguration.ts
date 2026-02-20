import { TotoMessageBus } from "../evt/MessageBus";
import { TotoControllerConfig } from "../model/TotoControllerConfig";
import { TotoMCPDelegate } from "./TotoMCPDelegate";

export interface MCPConfiguration {
    enableMCP: boolean;
    serverConfiguration: MCPServerConfiguration;
}

export interface MCPServerConfiguration {
    name: string;   // Name of the MCP server instance
    tools?: (new (messageBus: TotoMessageBus, config: TotoControllerConfig) => TotoMCPDelegate<any, any>)[]; // Optional list of tools to register on the server
}   