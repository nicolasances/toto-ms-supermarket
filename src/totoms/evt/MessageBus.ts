import { Request } from "express";
import { TotoMessage } from "./TotoMessage";
import { AWSConfiguration, TotoAPIController, TotoControllerConfig, TotoEnvironment, TotoRuntimeError, ValidationError } from "..";
import { SNSImpl } from "./impl/aws/SNSImpl";
import { GCPPubSubImpl } from "./impl/gcp/GCPPubSubImpl";
import { IMessageBus, IPubSub, IQueue, MessageDestination } from "./IMessageBus";
import { ProcessingResponse, TotoMessageHandler } from "./TotoMessageHandler";

export interface TotoMessageBusConfiguration {
    controller: TotoAPIController;
    customConfig: TotoControllerConfig;
    environment: TotoEnvironment;
    topics?: TopicIdentifier[];
}

export interface TopicIdentifier {
    logicalName: string;        // Logical name used in the app e.g., "user-updates-topic"
    resourceIdentifier: string; // Identifier of the topic used in the hyperscaler e.g., ARN for AWS, Topic Name for GCP
}

/**
 * Options for registering a message handler.
 * 
 * - pushOptions are needed for Pub/Sub PUSH implementations, where the message bus infrastructure pushes messages to an HTTP endpoint exposed by the application.
 *  - endpointPath is the path (relative to the base path of the API Controller) where the message bus will push messages to.
 */
export interface MessageHandlerRegistrationOptions {
    enablePushSupport?: boolean;
}

/**
 * This is the main class to be used by Message (Event) Producers and Consumers. 
 * 
 * It provides the capabilities to: 
 * - Publish messages to a message bus (as a producer), whether it is a pub/sub or queue-based message bus.
 * - Register message handlers to process incoming messages (as a consumer).
 * 
 * It relies on underlying implementations of IMessageBus, which can be either IPubSub or IQueue.
 * 
 * Important design choices: 
 * - The MessageBus registers its own handler for incoming messages from both PULL queues and PUSH Pub/Subs.
 * - The MessageBus ALWAYS registers itself with the API Controller on a /events endpoint to receive incoming PUSH messages from Pub/Sub implementations. 
 *      This happens independently of whether there are any registered handlers or not and whether PUSH support is enabled or not. 
 *      That gives generally more flexibility, so no extra configuration is needed for PUSH support.
 */
export class TotoMessageBus {

    protected messageHandlerRegistrations: MessageHandlerRegistration[] = [];

    private apiController: TotoAPIController;
    private messageBus: IMessageBus;
    private config: TotoMessageBusConfiguration;

    constructor(config: TotoMessageBusConfiguration) {

        this.config = config;

        // Store the API Controller reference
        this.apiController = config.controller;

        // Instantiate the Message Bus implementation
        if (this.config.environment.hyperscaler === "aws") this.messageBus = new SNSImpl({ awsRegion: (this.config.environment.hyperscalerConfiguration as AWSConfiguration).awsRegion });
        else if (this.config.environment.hyperscaler === "gcp") this.messageBus = new GCPPubSubImpl({ expectedAudience: this.config.customConfig.getExpectedAudience() });
        else throw new TotoRuntimeError(500, `Unsupported hyperscaler ${this.config.environment.hyperscaler} for Message Bus implementation`);

        // IMPORTANT! Register the message bus's handler (filter) in API Controller and Pull Queues and PubSubs
        // 1. For PULL queue implementations, register the MessageBus PULL callback so that messages pulled by the queue are routed to the MessageBus first
        if (this.messageBus instanceof IQueue) {
            (this.messageBus as IQueue).setMessageHandler(this.onPullMessageReceived.bind(this));
        }

        // 2. For PUSH Pub/Sub implementations, register the MessageBus PUSH callback in the API Controller so that all messages received on the endpoint are routed to the MessageBus
        this.apiController.registerPubSubMessageEndpoint("/events", this.onPushMessageReceived.bind(this));
    }


    /**
     * Registers a message handler to process incoming messages.
     * 
     * @param handler the handler to register
     */
    public registerMessageHandler(handler: TotoMessageHandler, options?: MessageHandlerRegistrationOptions): void {

        // Register the handler
        this.messageHandlerRegistrations.push(new MessageHandlerRegistration({
            messageHandler: handler,
            messageType: handler.getHandledMessageType(),
        }));

    }

    /**
     * Publishes a message to the message bus.
     * 
     * @param destination the message destination
     * @param message the message itself
     * @returns 
     */
    public publishMessage(destination: MessageDestination, message: TotoMessage): Promise<void> {

        // 1. Validate that the destination has the right properties set
        // 1.1. Check properties
        if (this.messageBus instanceof IPubSub && !destination.topic) throw new ValidationError(400, "MessageDestination.topic is required for Pub/Sub message buses");
        if (this.messageBus instanceof IQueue && !destination.queue) throw new ValidationError(400, "MessageDestination.queue is required for Queue message buses");

        // 2. Get the destination based on the environment and message bus implementation
        let resolvedDestination: MessageDestination;

        // 2.1. For Pub/Sub, resolve the topic name
        if (this.messageBus instanceof IPubSub) {

            const topicIdentifier = this.config.topics?.find(t => t.logicalName === destination.topic);

            if (!topicIdentifier) throw new ValidationError(400, `Topic [${destination.topic}] not found in configuration for publishing message of type [${message.type}]. This is a configuration error in your application.`);

            resolvedDestination = new MessageDestination({ topic: topicIdentifier.resourceIdentifier });
        }
        // 2.2. For Queue, just pass through for now
        else {
            resolvedDestination = destination;
        }

        // Invoke the handler
        return this.messageBus.publishMessage(resolvedDestination, message);
    }

    /**
     * Callback for all PULL queue implementations when a message is received from the queue.
     * This intercepts ALL incoming messages from PULL queues and routes them to the right handler.
     * 
     * @param envelope 
     */
    public async onPullMessageReceived(envelope: any): Promise<ProcessingResponse> {

        if (!(this.messageBus instanceof IQueue)) return { status: "ignored", responsePayload: "Message bus is not a Queue implementation" };

        // Decode the message
        const message: TotoMessage = this.messageBus.convert(envelope);

        // Get the handler
        const handler = this.findHandler("pull", message.type);

        if (!handler) return { status: "ignored", responsePayload: `No handler found for message type ${message.type}` };

        // Call the handler
        return handler.processMessage(message);
    }

    /**
     * Push endpoint for Pub/Sub implementations that support PUSH mechanisms.
     * This intercepts ALL incoming Pub/Sub PUSH requests and routes them to the right handler.
     * It is used by the API Controller when registering the endpoint for Pub/Sub PUSH messages: the API Controller calls this method when a request is received on the registered endpoint.
     * 
     * @param req 
     */
    public async onPushMessageReceived(req: Request): Promise<ProcessingResponse> {

        if (!this.messageBus) return { status: "ignored", responsePayload: "No message bus implementation found" };

        const isAuthorized = await this.messageBus.getRequestValidator().isRequestAuthorized(req);

        if (!isAuthorized) throw new TotoRuntimeError(401, "Unauthorized PubSub request: " + JSON.stringify(req));

        // For PubSub implementations, check if there's a filter to handle this request
        // If the message is not destined to the handler (e.g. message that needs to be intercepted by a filter), then let the filter handle it
        if (this.messageBus instanceof IPubSub) {
            const filter = (this.messageBus as IPubSub).filter(req);

            if (filter) return await filter.handle(req);
        }

        // Decode the message
        const message: TotoMessage = this.messageBus.convert(req);

        // Get the handler
        const handler = this.findHandler("push", message.type);

        if (!handler) return { status: "ignored", responsePayload: `No handler found for message type ${message.type}` };

        // Call the handler
        return handler.processMessage(message);
    }

    /**
     * Finds the registered handler for the given message type and bus type.
     * 
     * @param type the type of message bus (push or pull)
     * @param messageType the message type (the TotoMessage.type)
     * @returns the handler if found, null otherwise
     */
    private findHandler(type: "push" | "pull", messageType: string): TotoMessageHandler | null {

        const registration = this.messageHandlerRegistrations.find(r => r.messageType === messageType);

        return registration ? registration.messageHandler : null;
    }

}

/**
 * Utility class to track message handler registrations.
 */
class MessageHandlerRegistration {

    messageType: string;
    messageHandler: TotoMessageHandler;

    constructor(data: MessageHandlerRegistration) {
        this.messageHandler = data.messageHandler;
        this.messageType = data.messageType;
    }
}
