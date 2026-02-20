import { Request } from "express";
import { TotoMessage } from "../../TotoMessage";
import { ValidationError } from "../../../validation/Validator";
import { APubSubRequestFilter, APubSubRequestValidator, IPubSub, MessageDestination } from "../../IMessageBus";
import { googleAuthCheck } from "../../../validation/GoogleAuthCheck";
import { Logger } from "../../../logger/TotoLogger";
import { PubSub, Topic } from "@google-cloud/pubsub";

const topics = new Array<TopicWrapper>()

export class GCPPubSubImpl extends IPubSub {
    expectedAudience: string;
    pubsub: PubSub;

    constructor({ expectedAudience }: { expectedAudience: string }) {
        super();

        this.pubsub = new PubSub({ projectId: process.env.GCP_PID });
        this.expectedAudience = expectedAudience;
    }

    filter(req: Request): APubSubRequestFilter | null {
        return null;
    }

    getRequestValidator(): APubSubRequestValidator {
        return new GCPPubSubRequestValidator(this.expectedAudience);
    }

    async publishMessage(destination: MessageDestination, message: TotoMessage): Promise<void> {

        const logger = Logger.getInstance();

        logger.eventOut(message.cid, "Publishing the event [ " + message.type + " ] for object with id [ " + message.id + " ]. The following message is to be published: [ " + message.msg + " ]", "info");

        let topic = findTopicInCache(destination.topic!);

        if (!topic) {

            logger.eventOut(message.cid, `Instantiating PubSub Topic for topic [${destination.topic}]`, "info");

            topic = new TopicWrapper(destination.topic!, this.pubsub.topic(destination.topic!));
            topics.push(topic);

            logger.eventOut(message.cid, `PubSub Topic [${destination.topic}] instantiated!`, "info");
        }

        try {

            // await topic.topic.publishMessage({ data: Buffer.from(message as any) as any });

            await topic.topic.publishMessage({ json: message as any as Record<string, unknown> });

            logger.eventOut(message.cid, "Successfully published the event [ " + message.type + " ]", "info");

        } catch (e: any) {

            logger.eventOut(message.cid, "Publishing the event [ " + message.type + " ] failed. The following message had to be published: [ " + message.msg + " ]", "error");
            logger.eventOut(message.cid, e, 'error');
            console.error(e);

        }
    }

    convert(envelope: Request): TotoMessage {

        let msg = JSON.parse(String(Buffer.from(envelope.body.message.data, 'base64')))

        return {
            timestamp: msg.timestamp,
            cid: msg.cid,
            id: msg.id,
            type: msg.type,
            msg: msg.msg,
            data: msg.data
        }
    }

}
/**
 * Validator for HTTP Requests made by Google Cloud PubSub push infrastructure.
 * 
 * Implementation notes:
 * - GCP PubSub supports adding HTTP Headers (e.g. Authorization). Therefore, this validator can validate the request based on JWT tokens.
 */
export class GCPPubSubRequestValidator extends APubSubRequestValidator {

    constructor(private readonly expectedAudience: string) {
        super();
    }

    isRequestRecognized(req: Request): boolean {

        // Check if the request body has the typical GCP PubSub message structure
        if (!req.body || typeof req.body !== 'object') {
            return false;
        }

        // GCP PubSub push messages have a 'message' field and a 'subscription' field
        const hasMessage = 'message' in req.body && typeof req.body.message === 'object';

        if (!hasMessage) {
            return false;
        }

        // The message object should contain 'data' and 'messageId' fields
        const message = req.body.message;
        const hasData = 'data' in message;

        return hasData;
    }

    async isRequestAuthorized(req: Request): Promise<boolean> {

        const logger = Logger.getInstance();

        // Extraction of the headers
        const authorizationHeader = req.get('authorization');

        if (!authorizationHeader) throw new ValidationError(401, "No Authorization Header provided")

        const expectedAudience = this.expectedAudience;

        const googleAuthCheckResult = await googleAuthCheck("", authorizationHeader, expectedAudience, logger, false);

        if (googleAuthCheckResult.email) return true;

        return false;

    }

}

class TopicWrapper {

    topicName: string;
    topic: Topic;

    constructor(topicName: string, topic: Topic) {
        this.topicName = topicName;
        this.topic = topic;
    }
}

const findTopicInCache = (topicName: string) => {

    for (let topic of topics) {
        if (topic.topicName == topicName) return topic;
    }

    return null;
}