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

    async getPreferences(userEmail: string): Promise<Preferences> {
        const doc = await this.db.collection(this.config.getCollections().settings).findOne({ userEmail });
        if (!doc) return new Preferences(false, false);
        return Preferences.fromMongoBSON(doc);
    }

    async setPreferences(userEmail: string, preferences: Preferences): Promise<void> {
        await this.db.collection(this.config.getCollections().settings).updateOne(
            { userEmail },
            { $set: { chatMode: preferences.chatMode, readAloudMode: preferences.readAloudMode } },
            { upsert: true }
        );
    }
}
