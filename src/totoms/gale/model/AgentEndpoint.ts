import { AgentManifest } from "./AgentManifest";

export interface IAgentEndpoint {
    type: "conversational" | "taskExecutor";
    baseURL: string; 
    executionPath?: string;
    messagesPath: string;
    infoPath: string;
}

export class AgentEndpoint implements IAgentEndpoint {
    type: "conversational" | "taskExecutor";
    baseURL: string; 
    executionPath?: string;
    messagesPath: string;
    infoPath: string;

    constructor(data: IAgentEndpoint) {
        this.type = data.type;
        this.baseURL = data.baseURL;
        this.executionPath = data.executionPath;
        this.messagesPath = data.messagesPath;
        this.infoPath = data.infoPath;
    }

    static fromAgentManifest(agentManifest: AgentManifest): AgentEndpoint {

        const baseURL = process.env.SERVICE_BASE_URL;

        if (!baseURL) throw new Error("SERVICE_BASE_URL environment variable is not set, but is REQUIRED for Gale integration. This should be the baseURL (including basepath if any) of your microservice. E.g. https://myservice.example.com or https://myservice.example.com/basepath");

        return new AgentEndpoint({
            type: agentManifest.agentType,
            baseURL: baseURL, 
            messagesPath: `/agents/${agentManifest.agentId}/messages`,
            infoPath: `/agents/${agentManifest.agentId}/info`
        });
    }

}