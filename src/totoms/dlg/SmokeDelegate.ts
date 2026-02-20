import { Request } from "express";
import { TotoDelegate } from "../model/TotoDelegate";
import { UserContext } from "../model/UserContext";
import { TotoRequest } from "../model/TotoRequest";

export class SmokeDelegate extends TotoDelegate<SmokeRequest, SmokeResponse> {
    
    apiName?: string;   // Injected
    
    async do(req: SmokeRequest, userContext: UserContext | undefined): Promise<SmokeResponse> {

        return {
            api: this.apiName,
            status: "running"
        }

    }
    
    public parseRequest(req: Request): SmokeRequest {
        return new SmokeRequest();
    }

}

class SmokeRequest extends TotoRequest {

}

export interface SmokeResponse {
    api?: string,
    status: string
}
