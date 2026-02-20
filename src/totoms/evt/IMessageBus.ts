import { Request } from "express";
import { TotoMessage } from "./TotoMessage";
import { ProcessingResponse } from "./TotoMessageHandler";

/**
 * Interface for Message Bus implementations (e.g., Pub/Sub, SQS, RabbitMQ). 
 * Use this interface for publish-subscribe style message buses (e.g., Pub/Sub).
 * 
 * This abstract class is not exported as it SHOULD NOT be implemented directly. Instead, use the specialized interfaces IPubSub or IQueue.
 */
export abstract class IMessageBus {

    /**
     * Publishes a message to the specified topic or queue.
     * 
     * @param destination the destination (topic or queue) where the message should be published
     * @param message the TotoMessage to be published
     */
    abstract publishMessage(destination: MessageDestination, message: TotoMessage): Promise<void>;

    /**
     * Decodes the payload of a message received from the message bus and transforms it into a TotoMessage.
     * 
     * @param envelope the envelope of the message received from the message bus. 
     * The structure of the envelope depends on the specific message bus implementation.
     * For example: 
     *  - In GCP PubSub Push, then envelope will be the HTTP Request object received from PubSub.
     *  - In AWS SQS, then envelope will be the message object received from SQS (Message object from AWS SDK).
     *  - In AWS SNS Push, then envelope will be the HTTP Request object received from SNS. 
     */
    abstract convert(envelope: any): TotoMessage;

    /**
     * Gets the Request Validator for this implementation. 
     * The Request Validator is used to validate incoming requests from the messaging infrastructure. It checks: 
     * - if the request is recognized by the validator (i.e., if it comes from the expected messaging infrastructure and is well-formed)
     * - if the request is authorized (i.e., if it has the correct authentication/authorization to be processed)
     */
    abstract getRequestValidator(): APubSubRequestValidator;

}

/**
 * Implementation of IMessageBus for publish-subscribe style message buses (e.g., GCP PubSub, AWS SNS).
 */
export abstract class IPubSub extends IMessageBus {

    /**
     * Allows the pubSub implementation to filter incoming requests that should not be processed by the main event handler.
     * 
     * For example, in AWS SNS, subscription confirmation requests need to be handled separately from the main event processing and should not clutter application code.
     * 
     * @param req the HTTP Request from the pubsub infrastructure
     */
    abstract filter(req: Request): APubSubRequestFilter | null;
}

/**
 * Interface for Queue-like Message Buses (e.g., SQS, RabbitMQ)
 */
export abstract class IQueue extends IMessageBus {

    protected messageHandler: (msgPayload: any) => Promise<ProcessingResponse> = (msgPayload: any) => { throw new Error("Message handler not set"); };

    /**
     * Used for cleanup during application shutdown.
     * Implementations should close any open connections and release resources here, if needed and applicable.
     */
    abstract close(): Promise<void>;

    /**
     * Sets the message handler for the messages received from the queue. 
     * The message handler should always be a MessageBus instance, so that messages received from the queue are first routed to the MessageBus 
     * before being dispatched to the right handler.
     * 
     * This SHOULD NOT be overridden by subclasses.
     * 
     * @param handler the handler for the messages received from the queue
     */
    public setMessageHandler(handler: (msgPayload: any) => Promise<ProcessingResponse>): void {
        this.messageHandler = handler;
    }

}

export interface APubSubRequestFilter {
    handle(req: Request): Promise<ProcessingResponse>;
}

/**
 * Represents a destination for messages, either a topic (for Pub/Sub) or a queue (for queue-based message buses).
 */
export class MessageDestination {
    topic?: string;
    queue?: string;

    constructor(init: { topic: string; queue?: string } | { topic?: string; queue: string }) {
        Object.assign(this, init);
    }
}

/**
 * Class responsible for validating incoming requests from Messaging infrastructures.
 */
export abstract class APubSubRequestValidator {

    /**
     * Checks if the request is authorized.
     * 
     * @param req the HTTP request
     */
    abstract isRequestAuthorized(req: Request): Promise<boolean>;

    /**
     * Checks if the request is recognized by the validator. 
     * The concrete implementation of the validator will define if the request comes from the expected PubSub infrastructure that is handled by the validator.
     * 
     * @param req the HTTP request
     */
    abstract isRequestRecognized(req: Request): boolean;

}