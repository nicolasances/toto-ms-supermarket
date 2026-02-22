import * as http from "http";
import { Request } from "express";
import { APubSubRequestFilter, APubSubRequestValidator, IPubSub, MessageDestination } from "../../IMessageBus";
import { TotoMessage } from "../../TotoMessage";
import { Logger } from "../../../logger/TotoLogger";

const DEVQ_HOST = process.env.DEVQ_HOST ?? "localhost";
const DEVQ_PORT = parseInt(process.env.DEVQ_PORT ?? "8000");

/**
 * Local development implementation of IPubSub backed by DevQ (a lightweight local queue).
 * 
 * - Publishing: POSTs messages to DevQ at POST /msg
 * - Receiving:  DevQ pushes messages back to the /events endpoint exposed by the service.
 * 
 * No real authentication is performed - this implementation is intended for local development only.
 */
export class DevQImpl extends IPubSub {

    filter(req: Request): APubSubRequestFilter | null {
        return null;
    }

    getRequestValidator(): APubSubRequestValidator {
        return new DevQRequestValidator();
    }

    /**
     * Publishes a message to DevQ by POSTing to its /msg endpoint.
     * DevQ will then deliver it to the configured consumer URL.
     */
    async publishMessage(destination: MessageDestination, message: TotoMessage): Promise<void> {

        const logger = Logger.getInstance();

        logger.eventOut(message.cid, `[DevQ] Publishing message of type [${message.type}] to DevQ at ${DEVQ_HOST}:${DEVQ_PORT}/msg`, "info");

        const body = JSON.stringify(message);

        await new Promise<void>((resolve, reject) => {

            const req = http.request({
                hostname: DEVQ_HOST,
                port: DEVQ_PORT,
                path: "/msg",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body),
                    "Authorization": "Bearer local-dev-token",
                },
            }, (res) => {
                res.resume(); // drain the response
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error(`[DevQ] POST /msg returned HTTP ${res.statusCode}`));
                } else {
                    logger.eventOut(message.cid, `[DevQ] Message of type [${message.type}] successfully posted to DevQ`, "info");
                    resolve();
                }
            });

            req.on("error", (e) => {
                logger.eventOut(message.cid, `[DevQ] Failed to post message of type [${message.type}] to DevQ: ${e.message}`, "error");
                reject(e);
            });

            req.write(body);
            req.end();
        });
    }

    /**
     * Converts the incoming HTTP request from DevQ into a TotoMessage.
     * DevQ POSTs the original message payload directly as the request body.
     */
    convert(envelope: Request): TotoMessage {
        return envelope.body as TotoMessage;
    }

}

/**
 * No-op request validator for DevQ - all requests are considered authorized in local dev.
 */
class DevQRequestValidator extends APubSubRequestValidator {

    isRequestRecognized(req: Request): boolean {
        return true;
    }

    async isRequestAuthorized(req: Request): Promise<boolean> {
        return true;
    }

}
