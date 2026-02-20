import { Request } from "express";
import https from "https";
import moment from "moment-timezone";
import * as crypto from 'crypto';
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { TotoMessage } from "../../TotoMessage";
import { ValidationError } from "../../../validation/Validator";
import { Logger } from "../../../logger/TotoLogger";
import { APubSubRequestFilter, APubSubRequestValidator, IPubSub, MessageDestination } from "../../IMessageBus";
import { ProcessingResponse } from "../../TotoMessageHandler";

export interface SNSConfiguration {
    awsRegion: string;
}

export class SNSImpl extends IPubSub {

    private snsClient: SNSClient;

    constructor(private config: SNSConfiguration) {
        super();
        this.snsClient = new SNSClient({ region: this.config.awsRegion || "eu-north-1" });
    }

    getRequestValidator(): APubSubRequestValidator {
        return new SNSRequestValidator();
    }

    /**
     * Publish a message to the specified destination.
     * @param destination 
     * @param message 
     */
    async publishMessage(destination: MessageDestination, message: TotoMessage): Promise<void> {

        const logger = Logger.getInstance();

        if (!destination.topic) {
            throw new ValidationError(400, "Topic name is required for SNS publishing");
        }

        // Check that the topic is in the form of an ARN
        if (!destination.topic.startsWith("arn:aws:sns:")) {
            throw new ValidationError(400, `Invalid SNS topic ARN: ${destination.topic}. It must start with 'arn:aws:sns:'`);
        }

        const topicArn = destination.topic as string;

        if (!topicArn) {
            throw new ValidationError(400, `Topic ARN not found for topic name: ${destination.topic}. Make sure the topic ARN is loaded.`);
        }

        logger.eventOut(message.cid, `Publishing message ${message.type} to SNS topic ${destination.topic}`);

        try {
            const command = new PublishCommand({
                TopicArn: topicArn,
                Message: JSON.stringify(message),
            });

            const response = await this.snsClient.send(command);

            logger.eventOut(message.cid, `Message ${message.type} published to SNS topic ${destination.topic}. MessageId: ${response.MessageId}`);

        } catch (error) {
            logger.compute(message.cid, `Failed to publish message ${message.type} to SNS Topic ${destination.topic}: ${error}`, "error");
            throw error;
        }
    }

    /**
     * In SNS case, filters are used to handle subscription confirmation requests.
     * @param req 
     * @returns 
     */
    filter(req: Request): APubSubRequestFilter | null {

        if (req.get('x-amz-sns-message-type') == 'SubscriptionConfirmation') return new SNSSubscriptionConfirmationFilter();

        return null;
    }

    /**
     * Converts the message received from SNS into a TotoMessage.
     * In case of SNS Push messages, the envelope is the HTTP Request received from SNS.
     * 
     * @param envelope the HTTP Request received from SNS in a Push manner
     * @returns 
     */
    convert(envelope: Request): TotoMessage {

        const logger = Logger.getInstance();
        const req = envelope;

        if (req.get('x-amz-sns-message-type') == 'SubscriptionConfirmation' || req.get('x-amz-sns-message-type') == 'UnsubscribeConfirmation') {

            logger.compute('', `Confirming SNS subscription/unsubscription message.`);

            return {
                timestamp: moment().tz('Europe/Rome').format("YYYY.MM.DD HH:mm:ss"),
                cid: '',
                id: '',
                type: req.get('x-amz-sns-message-type')!,
                msg: '',
                data: req.body
            }
        }

        const message = req.body;

        if (message.Type == 'SubscriptionConfirmation' || message.Type == 'UnsubscribeConfirmation') return {
            timestamp: moment().tz('Europe/Rome').format("YYYY.MM.DD HH:mm:ss"),
            cid: '',
            id: '',
            type: message.Type,
            msg: '',
            data: message
        };

        if (message.Type == 'Notification') {

            // The message is in the "Message" field
            try {
                const payload = JSON.parse(message.Message);

                return {
                    timestamp: payload.timestamp,
                    cid: payload.cid,
                    id: payload.id,
                    type: payload.type,
                    msg: payload.msg,
                    data: payload.data
                }

            } catch (error) {

                // If the error is a parsing error
                if (error instanceof SyntaxError) {

                    logger.compute('', `SNS message is not a valid JSON: ${message.Message}`);

                    console.log(error)

                    throw new ValidationError(400, 'SNS message is not a valid JSON');

                }

                throw error;

            }
        }

        throw new ValidationError(400, `Unsupported SNS message type: ${message.Type}`);

    }
}

class SNSSubscriptionConfirmationFilter implements APubSubRequestFilter {

    async handle(req: Request): Promise<ProcessingResponse> {

        const logger = Logger.getInstance();

        return new Promise<ProcessingResponse>((resolve, reject) => {

            // Confirm the subscription by calling the SubscribeURL
            const message = req.body;

            const subscribeUrl = message.SubscribeURL;

            logger.compute('', `Confirming SNS subscription: ${subscribeUrl}`);

            https.get(subscribeUrl, {}, (response) => {

                if (response.statusCode === 200) {
                    logger.compute('', `SNS subscription confirmed successfully.`);
                    resolve({ status: "processed", responsePayload: "SNS subscription confirmed successfully" });
                }
                else {
                    logger.compute('', `Failed to confirm SNS subscription. Status: ${response.statusCode}`);
                    resolve({ status: "failed", responsePayload: `Error confirming SNS subscription: ${response.statusCode}` });
                }

            }).on('error', (err) => {
                logger.compute('', `Error confirming SNS subscription: ${err.message}`);
                resolve({ status: "failed", responsePayload: `Error confirming SNS subscription: ${err.message}` });
            });

        })

    }
}

export class SNSRequestValidator extends APubSubRequestValidator {

    isRequestRecognized(req: Request): boolean {

        const logger = Logger.getInstance();

        // Check if the x-amz-sns-message-type header is present 
        if (req.get('x-amz-sns-message-type')) {

            logger.compute('', `Received SNS request with header x-amz-sns-message-type: ${req.get("x-amz-sns-message-type")}`);

            if (req.get('x-amz-sns-message-type') == 'SubscriptionConfirmation' || req.get('x-amz-sns-message-type') == 'UnsubscribeConfirmation' || req.get('x-amz-sns-message-type') == 'Notification') return true;

        }

        return false;

        // const message = req.body;

        // if (!message || !message.Type || !message.Signature || !message.SigningCertURL) return false;

        // return this.isValidCertUrl(message.SigningCertURL);

    }

    async isRequestAuthorized(req: Request): Promise<boolean> {

        const logger = Logger.getInstance();

        try {

            // Check if the x-amz-sns-message-type header is present 
            if (req.get('x-amz-sns-message-type')) {

                if (req.get('x-amz-sns-message-type') == 'SubscriptionConfirmation' || req.get('x-amz-sns-message-type') == 'UnsubscribeConfirmation' || req.get('x-amz-sns-message-type') == 'Notification') return true;

            }

            const message = req.body;

            // 1. Verify message has required fields
            if (!message || !message.Type || !message.Signature || !message.SigningCertURL) {
                logger.compute('', 'SNS message missing required fields');
                return false;
            }

            // 2. Verify the certificate URL is from AWS
            // if (!this.isValidCertUrl(message.SigningCertURL)) {
            //     logger.compute('', 'Invalid SNS certificate URL');
            //     return false;
            // }

            // // 3. Download and verify the signing certificate
            // const certificate = await this.downloadCertificate(message.SigningCertURL);
            // if (!certificate) {
            //     logger.compute('', 'Failed to download SNS certificate');
            //     return false;
            // }

            // // 4. Build the string to sign based on message type
            // const stringToSign = this.buildStringToSign(message);

            // if (!stringToSign) {
            //     logger.compute('', 'Invalid SNS message type');
            //     return false;
            // }

            // // 5. Verify the signature
            // const isValid = this.verifySignature(certificate, stringToSign, message.Signature);
            // if (!isValid) {
            //     logger.compute('', 'SNS signature verification failed');
            //     return false;
            // }

            // 6. Optional: Verify topic ARN if you want to restrict to specific topics
            // const expectedTopicArn = process.env.SNS_TOPIC_ARN;
            // if (expectedTopicArn && message.TopicArn !== expectedTopicArn) {
            //     console.error('SNS message from unexpected topic');
            //     return false;
            // }

            logger.compute('', `SNS message validated successfully. Type: ${message.Type}`);

            return true;

        } catch (error) {
            console.error('SNS request validation error:', error);
            return false;
        }
    }

    /**
     * Verify the certificate URL is from AWS
     */
    private isValidCertUrl(certUrl: string): boolean {

        try {

            const url = new URL(certUrl);

            // Must be HTTPS and from amazonaws.com
            return url.protocol === 'https:' && (url.hostname.endsWith('.amazonaws.com') || url.hostname === 'sns.amazonaws.com');

        } catch {
            return false;
        }
    }

    /**
     * Download the certificate from AWS
     */
    private async downloadCertificate(certUrl: string): Promise<string | null> {

        return new Promise((resolve) => {

            https.get(certUrl, (res) => {

                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));

            }).on('error', (err) => {
                console.error('Certificate download error:', err);
                resolve(null);
            });
        });
    }

    /**
     * Build the string to sign based on SNS message type
     */
    private buildStringToSign(message: any): string | null {

        const fields: { [key: string]: string[] } = {
            'Notification': ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'],
            'SubscriptionConfirmation': ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'],
            'UnsubscribeConfirmation': ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type']
        };

        const messageType = message.Type;
        const fieldList = fields[messageType];

        if (!fieldList) {
            return null;
        }

        let stringToSign = '';
        for (const field of fieldList) {
            if (message[field] !== undefined) {
                stringToSign += `${field}\n${message[field]}\n`;
            }
        }

        return stringToSign;
    }

    /**
     * Verify the signature using the certificate
     */
    private verifySignature(certificate: string, stringToSign: string, signature: string): boolean {
        try {

            const verifier = crypto.createVerify('SHA1');

            verifier.update(stringToSign, 'utf8');

            // Pass signature as base64 string and specify encoding
            return verifier.verify(certificate, signature, 'base64');

        } catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }
}