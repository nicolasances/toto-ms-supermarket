import { TotoDelegate, UserContext } from "totoms";
import { Request } from "express";
import { Readable } from "stream";

const INTERVAL_MS = 3000;
const MAX_MESSAGES = 10;

export class AgentStreamDlg extends TotoDelegate<AgentStreamRequest, Readable> {

    protected async do(req: AgentStreamRequest, userContext?: UserContext): Promise<Readable> {

        const stream = new Readable({ read() {} });
        let closed = false;

        const send = (event: string, data: unknown) => {
            stream.push(`event: ${event}\n`);
            stream.push(`data: ${JSON.stringify(data)}\n\n`);
        };

        stream.on("close", () => { closed = true; });

        let count = 0;

        send("connected", { message: "SSE stream connected", timestamp: new Date().toISOString() });

        const interval = setInterval(() => {
            if (closed) {
                clearInterval(interval);
                return;
            }

            count++;
            send("ping", { message: `Ping #${count}`, timestamp: new Date().toISOString() });

            if (count >= MAX_MESSAGES) {
                send("done", { message: "Stream complete", totalMessages: count });
                stream.push(null);
                clearInterval(interval);
            }
        }, INTERVAL_MS);

        return stream;
    }

    parseRequest(req: Request): AgentStreamRequest {
        return {};
    }

}

interface AgentStreamRequest {}

