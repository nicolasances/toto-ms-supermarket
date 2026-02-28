import { Db } from "mongodb";
import { ControllerConfig } from "../Config";
import { Preferences } from "../model/Preferences";

export class SettingsStore {

    db: Db;
    cid: string;
    config: ControllerConfig;

    constructor(db: Db, cid: string, config: ControllerConfig) {
        this.db = db;
        this.cid = cid;
        this.config = config;
    }

    async getPreferences(): Promise<Preferences> {
        const doc = await this.db.collection(this.config.getCollections().settings).findOne({ settingsId: 'global' });
        if (!doc) return new Preferences(false, false);
        return Preferences.fromMongoBSON(doc);
    }

    async setPreferences(preferences: Preferences): Promise<void> {
        await this.db.collection(this.config.getCollections().settings).updateOne(
            { settingsId: 'global' },
            { $set: { chatMode: preferences.chatMode, readAloudMode: preferences.readAloudMode } },
            { upsert: true }
        );
    }
}
