import { Document, WithId } from "mongodb";

export class Supermarket {

    id?: string
    name: string
    location: string 

    constructor(name: string, location: string, id?: string) {
        this.name = name;
        this.location = location; 
        this.id = id;
    }

    static fromPersistentBson(bson: WithId<Document>) {

        const supermarket = new Supermarket(bson.name, bson.location);
        supermarket.id = bson._id.toHexString()

        return supermarket;

    }
}