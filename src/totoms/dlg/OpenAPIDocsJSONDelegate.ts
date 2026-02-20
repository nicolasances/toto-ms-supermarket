import { Request } from "express";
import { TotoDelegate } from "../model/TotoDelegate";
import { UserContext } from "../model/UserContext";
import { TotoMessageBus } from "../evt/MessageBus";
import { TotoControllerConfig } from "../model/TotoControllerConfig";

export class OpenAPIDocsJSONDelegate extends TotoDelegate<any, any> {
    
    swaggerDocJSON: any;

    constructor(messageBus: TotoMessageBus, config: TotoControllerConfig, swaggerDocJSON: any) {
        super(messageBus, config);
        this.swaggerDocJSON = swaggerDocJSON;
    }

    async do(req: Request, userContext: UserContext | undefined): Promise<any> {

        return this.swaggerDocJSON;

    }
    
    public parseRequest(req: Request) {
        return {};
    }

}
