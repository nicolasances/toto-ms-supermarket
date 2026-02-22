
export interface AgentManifest {
    agentType: "conversational" | "taskExecutor";
    agentId: string;
    humanFriendlyName: string;
    description?: string;
}