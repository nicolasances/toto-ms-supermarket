export type AgentStatusEvent = {
    type: string;
    data: any;
    timestamp: number;
};

export type AgentStatusRecord = {
    agentId: string;
    conversationId: string;
    messageId: string;
    events: AgentStatusEvent[];
    updatedAt: number;
};

/**
 * In-memory status store (mock DB). Replace with DB implementation later.
 */
export class AgentStatusStore {

    private static records = new Map<string, AgentStatusRecord>();

    private static key(agentId: string, conversationId: string, messageId: string) {
        return `${agentId}:${conversationId}:${messageId}`;
    }

    public create(agentId: string, conversationId: string, messageId: string) {
        const record: AgentStatusRecord = {
            agentId,
            conversationId,
            messageId,
            events: [],
            updatedAt: Date.now()
        };
        AgentStatusStore.records.set(AgentStatusStore.key(agentId, conversationId, messageId), record);
        return record;
    }

    public append(agentId: string, conversationId: string, messageId: string, type: string, data: any) {
        const record = this.get(agentId, conversationId, messageId) || this.create(agentId, conversationId, messageId);
        record.events.push({ type, data, timestamp: Date.now() });
        record.updatedAt = Date.now();
        return record;
    }

    public get(agentId: string, conversationId: string, messageId: string): AgentStatusRecord | undefined {
        return AgentStatusStore.records.get(AgentStatusStore.key(agentId, conversationId, messageId));
    }

    public getSince(agentId: string, conversationId: string, messageId: string, sinceIndex: number) {
        const record = this.get(agentId, conversationId, messageId);
        if (!record) return [] as AgentStatusEvent[];
        return record.events.slice(sinceIndex);
    }
}
