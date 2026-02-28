import { Document, WithId } from "mongodb";

export class Preferences {

    chatMode: boolean;
    readAloudMode: boolean;

    constructor(chatMode: boolean, readAloudMode: boolean) {
        this.chatMode = chatMode;
        this.readAloudMode = readAloudMode;
    }

    static fromTransferObject(body: any): Preferences {
        return new Preferences(
            body.chatMode ?? false,
            body.readAloudMode ?? false
        );
    }

    static fromMongoBSON(bson: WithId<Document>): Preferences {
        return new Preferences(
            bson.chatMode ?? false,
            bson.readAloudMode ?? false
        );
    }
}
