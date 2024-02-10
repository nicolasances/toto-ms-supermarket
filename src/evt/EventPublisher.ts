import { PubSub, Topic } from "@google-cloud/pubsub";
import moment from "moment-timezone";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ControllerConfig } from "../Config";

const pubsub = new PubSub({ projectId: process.env.GCP_PID });

const topics = new Array<TopicWrapper>()

/**
 * Manages the publishing of an event
 */
export class EventPublisher {

    execContext: ExecutionContext;
    cid: string;
    config: ControllerConfig;
    topic: TopicWrapper | null;

    constructor(execContext: ExecutionContext, topicName: TopicName) {

        this.execContext = execContext;
        this.cid = String(execContext.cid);
        this.config = this.execContext.config as ControllerConfig

        const logger = execContext.logger;

        this.topic = findTopicInCache(topicName);

        if (!this.topic) {

            logger.compute(this.cid, `Instantiating PubSub Topic for topic [${topicName}]`, "info");

            this.topic = new TopicWrapper(topicName, pubsub.topic(topicName));

            logger.compute(this.cid, `PubSub Topic [${topicName}] instantiated!`, "info");
        }

    }

    /**
     * Publishes an event to the topic passed in the constructor
     * @param id id of the object for which an event is published
     * @param eventType name of the event
     * @param msg message that describe the event
     * @param data optional additional JSON data to attach to the event
     * @returns Promise with the publishing result
     */
    publishEvent = async (id: string, eventType: EventType, msg: string, data?: any): Promise<PublishingResult> => {

        const logger = this.execContext.logger;

        let timestamp = moment().tz('Europe/Rome').format('YYYY.MM.DD HH:mm:ss');

        // Push message to PubSub
        let message = JSON.stringify({
            timestamp: timestamp,
            cid: this.cid,
            id: id,
            type: eventType,
            msg: msg,
            data: data
        });

        logger.compute(this.cid, "Publishing the event [ " + eventType + " ] for object with id [ " + id + " ]. The following message is to be published: [ " + message + " ]", "info");

        try {

            await this.topic!.topic.publishMessage({ data: Buffer.from(message) });

            logger.compute(this.cid, "Successfully published the event [ " + eventType + " ]", "info");

            return { published: true }

        } catch (e: any) {

            logger.compute(this.cid, "Publishing the event [ " + eventType + " ] failed. The following message had to be published: [ " + message + " ]", "error");
            logger.compute(this.cid, e, 'error');
            console.error(e);

            return { published: false }

        }

    }
}

export interface PublishingResult {
    published: boolean
}

export type TopicName = "supermarket"

export type EventType = 'item-added' | 'item-deleted';

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