import http from "request";
import { newTotoServiceToken } from "../../auth/TotoToken";
import { AgentManifest } from "../model/AgentManifest";
import { TotoControllerConfig } from "../../model/TotoControllerConfig";

export class GaleBrokerAPI {

    constructor(private galeBrokerURL: string, private config: TotoControllerConfig) { }

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
                body: JSON.stringify(request)
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

}


export interface RegisterAgentRequest {
    agentManifest: AgentManifest;
}
export class RegisterAgentResponse {

    constructor(private modifiedCount: number) { }

    static fromHTTPResponse(responseBody: any): RegisterAgentResponse {
        return new RegisterAgentResponse(
            JSON.parse(responseBody).modifiedCount
        );
    }

}