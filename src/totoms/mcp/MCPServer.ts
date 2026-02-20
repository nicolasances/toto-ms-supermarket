
import express from "express";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Logger, TotoAPIController, TotoControllerConfig, TotoControllerOptions, UserContext, Validator } from "..";
import { MCPServerConfiguration } from "./MCPConfiguration";
import { TotoMCPDelegate } from "./TotoMCPDelegate";

export class MCPServer {

    private mcpApp: express.Express;
    private server: McpServer;
    private config: MCPServerConfiguration;
    private apiControllerConfig: TotoControllerConfig;
    private controllerOptions: TotoControllerOptions;

    constructor(apiController: TotoAPIController, config: MCPServerConfiguration, apiControllerConfig: TotoControllerConfig, controllerOptions: TotoControllerOptions) {

        this.config = config;
        this.apiControllerConfig = apiControllerConfig;
        this.controllerOptions = controllerOptions;

        // MCP Server Setup - Stateless mode (each request gets fresh server/transport)
        this.mcpApp = apiController.app; // Use the same Express app as the API controller to share the server and port

        this.server = new McpServer({
            name: config.name,
            version: "1.0.0",
        });

        // Register tools 
        if (this.config.tools) {

            const tools = this.config.tools.map((ToolClass) => {

                return new ToolClass(undefined as any, this.apiControllerConfig)}   // If I ever need a MessageBus in a tool, I should add it here, for now it's undefined
            );

            this.registerTools(tools);
        }

        // Register the MCP route
        const path = '/mcp';
        const correctedPath = (this.controllerOptions.basePath ? this.controllerOptions.basePath.replace(/\/$/, '').trim() + path : path);

        this.mcpApp.post(correctedPath, express.json(), async (req, res) => {

            const validator = new Validator(this.apiControllerConfig, false);
            const logger = Logger.getInstance();

            try {

                logger.compute("MCP", "Received MCP Request on " + correctedPath)

                // Validating
                const userContext = await validator.validate(req);

                // Attach userContext to req.auth for MCP SDK to pass to tool handlers
                (req as any).auth = {
                    token: req.get('Authorization') ?? '',
                    clientId: userContext?.userId ?? 'anonymous',
                    scopes: [],
                    extra: {
                        userContext: userContext, 
                        cid: req.get('x-correlation-id')
                    }
                };

                // Stateless transport - no session management
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: undefined, // Stateless mode
                });

                // Connect and handle request
                await this.server.connect(transport);

                await transport.handleRequest(req, res, req.body);

                // Clean up after request completes
                res.on('close', () => {
                    transport.close();
                });

            } catch (error) {

                logger.compute("MCP", "Error handling MCP Request on " + correctedPath + ". Error: " + error)

                if (!res.headersSent) {

                    res.status(500).json({
                        jsonrpc: "2.0",
                        error: {
                            code: -32603,
                            message: "Internal error: " + (error instanceof Error ? error.message : String(error)),
                        },
                        id: null
                    });
                }
            }
        });

    }

    /**
     * Registers tools in the configuration
     */
    private registerTools(tools: TotoMCPDelegate<any, any>[]) {

        tools.forEach(tool => {

            const definition = tool.getToolDefinition();

            this.server.registerTool(definition.name, {
                title: definition.title,
                description: definition.description,
                inputSchema: definition.inputSchema,
            }, async (input, extra) => {

                const extraInfo = extra.authInfo?.extra as Extra;
                
                // Extract User Context and CID
                const userContext = extraInfo?.userContext as UserContext;
                tool.setCorrelationId(extraInfo?.cid);

                // Call the tool
                return await tool.processToolRequest(input, userContext) as any;
            });

        });
    }

}

interface Extra {
    userContext?: UserContext;
    cid?: string;
}