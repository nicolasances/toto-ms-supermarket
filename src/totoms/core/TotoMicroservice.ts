import { TopicIdentifier, TotoMessageBus, TotoMessageHandler, TotoControllerConfig, TotoAPIController, SecretsManager, Logger, APIConfiguration, TotoEnvironment, GCPConfiguration, AzureConfiguration, AWSConfiguration, SupportedHyperscalers, MCPConfiguration } from '..';
import { MCPServer } from '../mcp/MCPServer';

export class TotoMicroservice {

    private config: TotoControllerConfig;
    private apiController: TotoAPIController;
    private mcpServer?: MCPServer;
    private messageBus: TotoMessageBus;

    private static instance: TotoMicroservice;
    private static instancePromise: Promise<TotoMicroservice> | null = null;

    private constructor(config: TotoControllerConfig, apiController: TotoAPIController, messageBus: TotoMessageBus, mcpServer?: MCPServer) {
        this.config = config;
        this.apiController = apiController;
        this.messageBus = messageBus;
        this.mcpServer = mcpServer;
    }

    public static async init(config: TotoMicroserviceConfiguration): Promise<TotoMicroservice> {

        if (TotoMicroservice.instance) return TotoMicroservice.instance;
        if (TotoMicroservice.instancePromise) return TotoMicroservice.instancePromise;

        Logger.init(config.serviceName);

        const secretsManager = new SecretsManager(config.environment);

        // Instantiate the Microservice-specific configuration
        const customConfig = new config.customConfiguration(secretsManager);

        // If there are secrets to load for the message bus, load them now
        let topicNames: TopicIdentifier[] | undefined = undefined;
        if (config.messageBusConfiguration && config.messageBusConfiguration.topics) {

            // Load the topic names (resource identifiers) from Secrets Manager
            const topicNamesPromises = config.messageBusConfiguration.topics.map(async (topic) => {
                const secretValue = await secretsManager.getSecret(topic.secret);

                return { logicalName: topic.logicalName, resourceIdentifier: secretValue } as TopicIdentifier;
            });

            topicNames = await Promise.all(topicNamesPromises);
        }

        // Load the customer configuration
        TotoMicroservice.instancePromise = customConfig.load().then(() => {

            // Create the API controller
            const apiController = new TotoAPIController({ apiName: config.serviceName, config: customConfig, environment: config.environment }, { basePath: config.basePath, openAPISpecification: config.apiConfiguration.openAPISpecification, port: config.port });

            // Create the message bus
            const bus = new TotoMessageBus({
                controller: apiController,
                customConfig: customConfig,
                topics: topicNames,
                environment: config.environment
            });

            // Register the message handlers
            if (config.messageBusConfiguration && config.messageBusConfiguration.messageHandlers) {
                for (const handler of config.messageBusConfiguration.messageHandlers) {
                    bus.registerMessageHandler(new handler(customConfig, bus));
                }
            }

            // Register the API endpoints
            if (config.apiConfiguration && config.apiConfiguration.apiEndpoints) {

                for (const endpoint of config.apiConfiguration.apiEndpoints) {

                    // Create an instance of the delegate
                    const delegateInstance = new endpoint.delegate(bus, customConfig);

                    // Add the endpoint to the controller
                    apiController.path(endpoint.method, endpoint.path, delegateInstance, endpoint.options);
                }
            }

            // Register the streaming API endpoints
            if (config.apiConfiguration && config.apiConfiguration.streamEndpoints) {

                for (const endpoint of config.apiConfiguration.streamEndpoints) {

                    // Create an instance of the delegate
                    const delegateInstance = new endpoint.delegate(bus, customConfig);

                    // Add the endpoint to the controller
                    apiController.streamGET(endpoint.path, delegateInstance, endpoint.options);
                }
            }

            // Create the MCP Server if enabled
            let mcpServer: MCPServer | undefined = undefined;
            if (config.mcpConfiguration?.enableMCP) {

                mcpServer = new MCPServer(apiController, config.mcpConfiguration.serverConfiguration, customConfig, {basePath: config.basePath} );

            }

            return new TotoMicroservice(customConfig, apiController, bus, mcpServer);
        });

        return TotoMicroservice.instancePromise;

    }

    public async start() {
        this.apiController.listen()
    }
}

export interface TotoMicroserviceConfiguration {
    serviceName: string;
    basePath?: string;
    port?: number;
    environment: TotoEnvironment;
    customConfiguration: new (secretsManager: SecretsManager) => TotoControllerConfig;
    apiConfiguration: APIConfiguration;
    messageBusConfiguration?: MessageBusConfiguration;
    mcpConfiguration?: MCPConfiguration;
}

export interface MessageBusConfiguration {
    topics: { logicalName: string; secret: string }[];
    messageHandlers?: (new (config: TotoControllerConfig, messageBus: TotoMessageBus) => TotoMessageHandler)[];
}

export function getHyperscalerConfiguration(): GCPConfiguration | AWSConfiguration | AzureConfiguration {

    const hyperscaler = process.env.HYPERSCALER as SupportedHyperscalers || "aws";

    switch (hyperscaler) {
        case "gcp":
            return { gcpProjectId: process.env.GCP_PID || "" } as GCPConfiguration;
        case "aws":
            return {
                awsRegion: process.env.AWS_REGION || "eu-north-1",
                environment: process.env.ENVIRONMENT as "dev" | "test" | "prod" || "dev"
            } as AWSConfiguration;
        case "azure":
            return { azureRegion: process.env.AZURE_REGION || "" } as AzureConfiguration;
        default:
            throw new Error(`Unsupported hyperscaler: ${hyperscaler}`);
    }
}
