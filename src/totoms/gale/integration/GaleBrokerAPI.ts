import http from "request";
import { newTotoServiceToken } from "../../auth/TotoToken";
import { AgentManifest } from "../model/AgentManifest";
import { TotoControllerConfig } from "../../model/TotoControllerConfig";
import { AgentEndpoint } from "../model/AgentEndpoint";
import { AgentConversationMessage } from "../model/AgentConversationMessage";

export class GaleBrokerAPI {

    galeBrokerURL: string;

    constructor(private config: TotoControllerConfig) {
        
        const galeBrokerURL = process.env.GALE_BROKER_URL;

        if (!galeBrokerURL) throw new Error("GALE_BROKER_URL environment variable is not set, required for Gale integration");
        
        this.galeBrokerURL = galeBrokerURL;
    }

    /**
     * Executes the agent with the given input.
     * @param agentInput any input data to provide to the agent. This is agent-specific.
     * @returns a promise that resolves to the agent trigger response.
     */
    async registerAgent(request: RegisterAgentRequest): Promise<RegisterAgentResponse> {

        const token = newTotoServiceToken(this.config);

        return new Promise<RegisterAgentResponse>((success, failure) => {

            http({
                uri: `${this.galeBrokerURL}/catalog/agents`,
                method: 'PUT',
                headers: {
                    'x-correlation-id': 'Gale-registerAgent',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    agentDefinition: {
                        name: request.agentManifest.humanFriendlyName,
                        agentId: request.agentManifest.agentId,
                        agentType: request.agentManifest.agentType,
                        description: request.agentManifest.description,
                        endpoint: request.endpoint
                    }
                })
            }, (err: any, resp: any, body: any) => {

                if (err) {
                    console.log(err)
                    failure(err);
                    return;
                }

                // Parse the output
                try {
                    const agentResponse = RegisterAgentResponse.fromHTTPResponse(body);
                    success(agentResponse);
                }
                catch (error) {
                    console.log(body);
                    failure(error);
                }


            })
        })

    }

    /**
     * Posts a message to a conversation of an agent on Gale Broker. 
     * 
     * This is used to send messages back to the user during a conversation. 
     * Gale Broker will store those messages and provide an SSE endpoint to the client to receive those messages in real time.
     * 
     * @param msg 
     */
    async postConversationMessage(msg: AgentConversationMessage) {

        const token = newTotoServiceToken(this.config);

        return new Promise<RegisterAgentResponse>((success, failure) => {

            http({
                uri: `${this.galeBrokerURL}/messages`,
                method: 'PUT',
                headers: {
                    'x-correlation-id': msg.conversationId || "",
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(msg)
            }, (err: any, resp: any, body: any) => {

                if (err) {
                    console.log(err)
                    failure(err);
                    return;
                }

            })
        })

    }

}


export interface RegisterAgentRequest {
    agentManifest: AgentManifest;
    endpoint: AgentEndpoint;
}

export class RegisterAgentResponse {

    constructor(private modifiedCount: number) { }

    static fromHTTPResponse(responseBody: any): RegisterAgentResponse {
        return new RegisterAgentResponse(
            JSON.parse(responseBody).modifiedCount
        );
    }

}