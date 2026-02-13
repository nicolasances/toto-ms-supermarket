import { Request } from "express";
import { TotoDelegate, UserContext, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { SupermarketStore } from "../store/SupermarketStore";

interface GetSupermarketsRequest extends TotoRequest {
}

interface GetSupermarketsResponse {
    [key: string]: any;
}

export class GetSupermarkets extends TotoDelegate<GetSupermarketsRequest, GetSupermarketsResponse> {

    async do(req: GetSupermarketsRequest, userContext?: UserContext): Promise<GetSupermarketsResponse> {

        const logger = Logger.getInstance();

        return new SupermarketStore().getSupermarkets()

    }

    parseRequest(req: Request): GetSupermarketsRequest {
        return {};
    }

}