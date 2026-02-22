import { TotoDelegate, UserContext, ValidationError } from "totoms";
import { Request } from "express";
import { Readable } from "stream";
import { AgentStatusStore } from "../store/AgentStatusStore";

export class AgentStreamDlg extends TotoDelegate<AgentStreamRequest, Readable> {

    protected async do(req: AgentStreamRequest, userContext?: UserContext): Promise<Readable> {

        const stream = new Readable({ read() {} });
        let closed = false;

        const send = (event: string, data: unknown) => {
            stream.push(`event: ${event}\n`);
            stream.push(`data: ${JSON.stringify(data)}\n\n`);
        };

        const statusStore = new AgentStatusStore();

        const run = async () => {
            try {
                send("ready", { status: "connected" });

                const pollIntervalMs = 1000;
                const maxWaitMs = 1000 * 60 * 5;
                let lastIndex = 0;
                const startedAt = Date.now();
                let timer: NodeJS.Timeout | undefined;

                const poll = () => {
                    if (closed) return;
                    const newEvents = statusStore.getSince(req.agentId, req.conversationId, req.messageId, lastIndex);
                    if (newEvents.length > 0) {
                        for (const evt of newEvents) {
                            send(evt.type, evt.data);
                            if (evt.type === "done" || evt.type === "error") {
                                stream.push(null);
                                return;
                            }
                        }
                        lastIndex += newEvents.length;
                    }

                    if (Date.now() - startedAt > maxWaitMs) {
                        send("timeout", { message: "Stream timed out" });
                        stream.push(null);
                        return;
                    }

                    timer = setTimeout(poll, pollIntervalMs);
                };

                stream.on("close", () => {
                    closed = true;
                    if (timer) clearTimeout(timer);
                });

                stream.on("end", () => {
                    closed = true;
                    if (timer) clearTimeout(timer);
                });

                poll();

            } catch (error) {
                send("error", { message: `${error}` });
                stream.push(null);
            }
        };

        void run();

        return stream;

    }

    parseRequest(req: Request): AgentStreamRequest {
        const agentId = String(req.params.agentId || "").trim();
        const conversationId = String(req.params.conversationId || "").trim();
        const messageId = String(req.query.messageId || "").trim();

        if (!agentId) throw new ValidationError(400, "No agentId provided");
        if (!conversationId) throw new ValidationError(400, "No conversationId provided");
        if (!messageId) throw new ValidationError(400, "No messageId provided");

        return { agentId, conversationId, messageId };
    }

}

interface AgentStreamRequest {
    agentId: string;
    conversationId: string;
    messageId: string;
}
