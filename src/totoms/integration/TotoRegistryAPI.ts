import http from "request";
import { newTotoServiceToken, TotoRuntimeError, TotoControllerConfig, Logger, SupportedHyperscalers } from "..";
import { v4 as uuidv4 } from 'uuid';

export class TotoRegistryAPI {

    constructor(protected config: TotoControllerConfig) { }

    /**
     * Registers a new API with the Toto API Registry
     * 
     * @param request the api to register
     * @returns the registration response
     */
    async registerAPI(request: RegisterAPIRequest): Promise < RegisterAPIResponse > {

            const logger = Logger.getInstance();

            logger.compute("", `Registering API [ ${request.apiName} ] with Toto Registry at [ ${this.config.getTotoRegistryEndpoint()} ].`, "info");

            return new Promise((success, failure) => {

                http({
                    uri: `${this.config.getTotoRegistryEndpoint()}/apis`,
                    method: 'POST',
                    headers: {
                        'x-correlation-id': uuidv4(),
                        'Authorization': "Bearer " + newTotoServiceToken(this.config),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(request)
                },
                    (err, resp, body) => {
                        handleResponse<RegisterAPIResponse>(err, resp, body).then(success).catch(failure)
                    });
            });
        }

    async getAPIs(): Promise < GetAPIsResponse > {

            return new Promise((success, failure) => {

                http({
                    uri: `${this.config.getTotoRegistryEndpoint()}/apis`,
                    method: 'GET',
                    headers: {
                        'x-correlation-id': uuidv4(),
                        'Authorization': "Bearer " + newTotoServiceToken(this.config),
                        'Content-Type': 'application/json'
                    }
                },
                    (err, resp, body) => {
                        handleResponse<GetAPIsResponse>(err, resp, body).then(success).catch(failure)
                    });
            });
        }

    }

export interface GetAPIsResponse {
    apis: APIEndpoint[];
}

export interface APIEndpoint {
    apiName: string;
    endpointURL: string;
}

export interface RegisterAPIResponse {
    inserted: boolean;
    updated: boolean;
    insertedId: string;
}

export interface RegisterAPIRequest {

    apiName: string;        // e.g. toto-ms-ex1
    endpointURL?: string;    // e.g. https://api.example.com/toto-ms-ex1/ex1 (includes basePath, if any)
    hyperscaler?: SupportedHyperscalers;  // e.g. 'aws' or 'gcp' (if endpointURL is not provided)
    basePath?: string;      // e.g. 'ex1' (if endpointURL is not provided)

}


/**
 * Handle the response from an HTTP request, taking care of parsing the body and handling errors. 
 * 
 * @param err 
 * @param resp 
 * @param body 
 * @returns 
 */
async function handleResponse<T>(err: any, resp: any, body: any): Promise<T> {

    if (err) {
        console.log(err)
        throw new TotoRuntimeError(500, `HTTP Request Error: ${err}`);
    }

    // Parse the output
    try {
        const parsedBody = parseBody(body);

        return parsedBody as T;
    }
    catch (error) {

        if (error instanceof TotoRuntimeError) throw error;

        console.log(body);

        throw new TotoRuntimeError(500, `HTTP Response Error: ${error}`);
    }
}

function parseBody(body: any): any {
    try {
        return JSON.parse(body);
    } catch (error) {
        console.log(body);
        throw new TotoRuntimeError(500, `JSON Parse Error. Invalid Response Body: ${body}`);
    }
}
