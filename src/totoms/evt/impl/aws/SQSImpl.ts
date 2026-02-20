import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, GetQueueUrlCommand, SQS } from '@aws-sdk/client-sqs';
import { APubSubRequestValidator, IQueue, MessageDestination } from '../../IMessageBus';
import { Logger } from '../../../logger/TotoLogger';
import { TotoMessage } from '../../TotoMessage';
import { Request } from 'express';

export class SQSMessageBus extends IQueue {

    private client: SQSClient;
    private queueUrl: string | undefined;
    private isPolling: boolean = false;

    constructor(private readonly queueName: string, private readonly region: string) {
        super(); 

        this.client = new SQSClient({ region: this.region });

        this.startPolling();
    }

    getRequestValidator(): APubSubRequestValidator {
        return new SQSRequestValidator();
    }

    /**
     * Decodes the message received from SQS.
     * @param envelope the msg received by SQS. Messages received by SQS have the following structure: 
     * {
     *   "MessageId": "string",
     *   "ReceiptHandle": "string",
     *   "Body": "string"
     * }
     */
    convert(envelope: any): TotoMessage {

        const body = JSON.parse(envelope.Body || '{}');

        return body as TotoMessage;

    }

    async initialize(): Promise<void> {

        const command = new GetQueueUrlCommand({ QueueName: this.queueName });

        const response = await this.client.send(command);

        this.queueUrl = response.QueueUrl;
    }

    async publishMessage(destination: MessageDestination, message: TotoMessage): Promise<void> {

        if (!this.queueUrl) {
            await this.initialize();
        }

        const command = new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify(message),
        });

        await this.client.send(command);
    }

    async pollQueue(): Promise<any[]> {

        const command = new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
        });

        const response = await this.client.send(command);

        return response.Messages || [];
    }

    /**
     * Starts polling the SQS queue for messages.
     */
    async startPolling(): Promise<void> {

        const logger = Logger.getInstance();

        if (!this.queueUrl) {
            await this.initialize();
        }

        if (this.isPolling) {
            logger.compute("", 'Polling already started');
            return;
        }

        this.isPolling = true;
        logger.compute("", `Started polling SQS queue: ${this.queueName}`);

        while (this.isPolling) {

            try {
            
                const messages = await this.pollQueue();

                if (messages.length > 0) {

                    logger.compute("", `Received ${messages.length} message(s)`);

                    for (const msg of messages) {

                        // Call the handler
                        await this.messageHandler(msg);

                        // Delete message after logging
                        if (msg.ReceiptHandle) {

                            await this.client.send(
                                new DeleteMessageCommand({
                                    QueueUrl: this.queueUrl,
                                    ReceiptHandle: msg.ReceiptHandle,
                                })
                            );
                            logger.compute("", 'Message deleted from queue');
                        }
                    }
                }
            } catch (error) {
                
                logger.compute("", `Error polling SQS: ${error}`);

                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    stopPolling(): void {

        const logger = Logger.getInstance();
        
        logger.compute("", 'Stopping SQS polling');
        
        this.isPolling = false;
    }

    async close(): Promise<void> {
        
        this.stopPolling();
        
        this.client.destroy();
    }

}

class SQSRequestValidator implements APubSubRequestValidator {

    isRequestAuthorized(req: Request): Promise<boolean> {
        return Promise.resolve(true);
    }

    isRequestRecognized(req: Request): boolean {
        return true;
    }
}