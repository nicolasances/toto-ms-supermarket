import { Request } from "express";
import { TotoDelegate, UserContext, TotoRequest, Logger, ValidationError } from "totoms";
import { ControllerConfig } from "../Config";
import { SettingsStore } from "../store/SettingsStore";
import { Preferences } from "../model/Preferences";

interface GetPreferencesRequest extends TotoRequest {}

interface GetPreferencesResponse {
    preferences: Preferences;
}

export class GetPreferences extends TotoDelegate<GetPreferencesRequest, GetPreferencesResponse> {

    async do(req: GetPreferencesRequest, userContext?: UserContext): Promise<GetPreferencesResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        if (!userContext?.email) throw new ValidationError(401, 'User context with email is required');

        try {

            const db = await config.getMongoDb(config.getDBName());

            const store = new SettingsStore(db, this.cid!, config);

            const preferences = await store.getPreferences(userContext.email);

            return { preferences };

        } catch (error) {
            logger.compute(this.cid, `Error getting preferences: ${error}`);
            throw error;
        }

    }

    parseRequest(req: Request): GetPreferencesRequest {
        return {};
    }

}
