import { Document, WithId } from "mongodb";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";

export class ListItem {

    id?: string
    name: string
    ticked: boolean

    constructor(name: string, ticked?: boolean) {
        this.name = name;
        this.ticked = ticked ?? false
    }

    static fromTransferObject(httpBody: any) {

        // 1. Validate
        if (!httpBody.name) throw new ValidationError(400, `Missing item name`)

        // 2. Build the item
        const item = new ListItem(httpBody.name, httpBody.ticked)
        item.id = httpBody.id;

        return item;

    }

    static fromMongoBSON(bson: WithId<Document>) {

        const item = new ListItem(bson.name, bson.ticked);
        
        item.id = bson._id.toHexString();

        return item;
    }

}