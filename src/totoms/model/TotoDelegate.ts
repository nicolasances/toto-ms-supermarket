import { Request } from "express";
import { UserContext } from "./UserContext";
import { TotoMessageBus } from "../evt/MessageBus";
import { TotoControllerConfig } from "./TotoControllerConfig";
import { TotoRequest } from "./TotoRequest";

export abstract class TotoDelegate<I extends TotoRequest, O> {

    protected cid?: string = undefined;

    constructor(protected messageBus: TotoMessageBus, protected config: TotoControllerConfig) { }

    /**
     * Processes the incoming request and returns a Promise with the result. 
     * 
     * This method wraps the abstract do() method to provide common pre- and post-processing logic if needed.
     * 
     * @param req a Toto request
     * @param userContext the User Context, if available
     */
    public async processRequest(req: I, userContext?: UserContext): Promise<O> {

        return this.do(req, userContext);
    }

    /**
     * Method to be implemented by the delegate to process the request. 
     * This is where the main logic of the delegate should be implemented.
     * 
     * @param req The TotoRequest object
     * @param userContext the User Context
     */
    protected abstract do(req: I, userContext?: UserContext): Promise<O>

    /**
     * Parse the incoming Express Request into the specific TotoRequest type expected by this delegate.
     * 
     * Important: 
     * - This method should also have the responsibility to validate the incoming request and throw appropriate errors if the request is invalid.
     * 
     * @param req the Express Request object
     * 
     * @return an instance of the specific TotoRequest type expected by this delegate
     * 
     * @throws ValidationError if the request is invalid
     */
    public abstract parseRequest(req: Request): I;

    /**
     * Sets the delegate's correlation Id for the current request. This can be used for logging and tracing purposes.
     * 
     * @param cid the request's correlation Id (if any)
     */
    public setCorrelationId(cid?: string) {
        this.cid = cid;
    }

}

export interface FakeRequest {

    query: any,
    params: any,
    headers: any,
    body: any

}