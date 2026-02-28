import { Request } from "express";
import { TotoDelegate, UserContext, TotoRequest, Logger, ValidationError } from "totoms";
import { ControllerConfig } from "../Config";
import { SettingsStore } from "../store/SettingsStore";
import { Preferences } from "../model/Preferences";

interface SetPreferencesRequest extends TotoRequest {
    preferences: Preferences;
}

interface SetPreferencesResponse {
    updated: boolean;
}

export class SetPreferences extends TotoDelegate<SetPreferencesRequest, SetPreferencesResponse> {

    async do(req: SetPreferencesRequest, userContext?: UserContext): Promise<SetPreferencesResponse> {

        const config = this.config as ControllerConfig;
        const logger = Logger.getInstance();

        if (!userContext?.email) throw new ValidationError(401, 'User context with email is required');

        try {

            const db = await config.getMongoDb(config.getDBName());

            const store = new SettingsStore(db, this.cid!, config);

            await store.setPreferences(userContext.email, req.preferences);

            return { updated: true };

        } catch (error) {
            logger.compute(this.cid, `Error setting preferences: ${error}`);
            throw error;
        }

    }

    parseRequest(req: Request): SetPreferencesRequest {
        return {
            preferences: Preferences.fromTransferObject(req.body)
        };
    }

}
