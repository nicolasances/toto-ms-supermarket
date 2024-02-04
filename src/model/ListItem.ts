import { ValidationError } from "toto-api-controller/dist/validation/Validator";

export class ListItem {

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
        return new ListItem(httpBody.name, httpBody.ticked)

    }

}