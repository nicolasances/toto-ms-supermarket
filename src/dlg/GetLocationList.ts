import { Request } from "express";
import { TotoDelegate, UserContext, ValidationError, TotoRequest, Logger } from "totoms";
import { ControllerConfig } from "../Config";
import { SupermarketStore } from "../store/SupermarketStore";
import { LocationListStore } from "../store/LocationListStore";

interface GetLocationListRequest extends TotoRequest {
    id: string;
}

interface GetLocationListResponse {
    items: any[];
}

export class GetLocationList extends TotoDelegate<GetLocationListRequest, GetLocationListResponse> {

    async do(req: GetLocationListRequest, userContext?: UserContext): Promise<GetLocationListResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();
        const supermarketId = req.id;

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());

            // Create the stores
            const supermarketStore = new SupermarketStore()
            const locationListStore = new LocationListStore(db, this.cid!, config);

            // Get the supermarket
            const supermarket = await supermarketStore.getSupermarket(supermarketId);

            // Get the list
            const items = await locationListStore.getLocationListItems(supermarket);

            return { items: items }

        } catch (error) {

            if (error instanceof ValidationError) {
                throw error;
            }
            else {
                logger.compute(this.cid, `Error getting location list: ${error}`);
                throw error;
            }

        }

    }

    parseRequest(req: Request): GetLocationListRequest {
        return {
            id: req.params.id
        };
    }

}