import http from "request";
import { v4 as uuidv4 } from "uuid";
import { Logger, newTotoServiceToken, RegistryCache, TotoControllerConfig, TotoRuntimeError } from "..";

export class TotoAPI {

    protected apiName: string;
    protected authToken: string;
    protected config: TotoControllerConfig;

    constructor(apiName: string, config: TotoControllerConfig, authToken?: string) {
        this.authToken = authToken || newTotoServiceToken(config);
        this.apiName = apiName;
        this.config = config;
    }

    protected async get<T>(request: TotoAPIRequest, ResponseClass: TotoAPIResponseConstructor<T>): Promise<T> {
        return this.call("GET", request, ResponseClass);
    }

    protected async post<T>(request: TotoAPIRequest, ResponseClass: TotoAPIResponseConstructor<T>): Promise<T> {
        return this.call("POST", request, ResponseClass);
    }

    protected async put<T>(request: TotoAPIRequest, ResponseClass: TotoAPIResponseConstructor<T>): Promise<T> {
        return this.call("PUT", request, ResponseClass);
    }

    protected async delete<T>(request: TotoAPIRequest, ResponseClass: TotoAPIResponseConstructor<T>): Promise<T> {
        return this.call("DELETE", request, ResponseClass);
    }


    /**
     * Calls the specified endpoint
     * 
     * @param request the request to send 
     * @returns the response in JSON
     */
    private async call<T>(method: string, request: TotoAPIRequest, ResponseClass: TotoAPIResponseConstructor<T>): Promise<T> {

        const logger = Logger.getInstance();
        const endpoint = await RegistryCache.getInstance().getEndpoint(this.apiName);

        if (!endpoint || !endpoint.endpointURL) {
            logger?.compute(request.cid, `TotoAPI Error: Unable to find endpoint for API [${this.apiName}]`, "error");
            throw new TotoRuntimeError(500, `TotoAPI Error: Unable to find endpoint for API [${this.apiName}]`);
        }

        logger.compute(request.cid, `Calling ${method} ${endpoint.endpointURL}${request.path}`);

        return new Promise<T>((success, failure) => {

            const req = {
                uri: `${endpoint.endpointURL}${request.path}`,
                method: method,
                headers: {
                    'x-correlation-id': request.cid,
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
            } as any

            if (request.body) {
                req.body = JSON.stringify(request.body);
            }

            http(req, (err: any, resp: any, body: any) => {
                handleResponse<T>(err, resp, body, ResponseClass).then(success).catch(failure)
            });
        })
    }

}

export class TotoAPIRequest {

    path: string;
    cid: string;
    body?: any;

    constructor(path: string, body?: any, cid?: string) {
        this.path = path;
        this.cid = cid || uuidv4();
        this.body = body;

        // If the path does not start with a '/', add it
        if (!this.path.startsWith('/')) {
            this.path = `/${this.path}`;
        }
    }

}

export interface TotoAPIResponseConstructor<T> {
    fromParsedHTTPResponseBody(body: any): T;
}

/**
 * Handle the response from an HTTP request, taking care of parsing the body and handling errors. 
 * 
 * @param err 
 * @param resp 
 * @param body 
 * @param ResponseClass the class constructor with fromParsedHTTPResponseBody method
 * @returns 
 */
async function handleResponse<T>(err: any, resp: any, body: any, ResponseClass: TotoAPIResponseConstructor<T>): Promise<T> {

    if (err) {
        console.log(err)
        throw new TotoRuntimeError(500, `HTTP Request Error: ${err}`);
    }

    // Parse the output
    try {
        const parsedBody = parseBody(body);

        return ResponseClass.fromParsedHTTPResponseBody(parsedBody);
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