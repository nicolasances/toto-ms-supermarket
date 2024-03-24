import { Request } from "express"
import moment from "moment-timezone"
import { ValidationError } from "toto-api-controller/dist/validation/Validator"


export class TrainingExample {

    id?: string
    item1: string
    item2: string
    label: Label
    date: string

    constructor(item1: string, item2: string, label: Label, date: string) {
        this.item1 = item1;
        this.item2 = item2;
        this.label = label;
        this.date = date;
    }

    static fromHttpRequest(req: Request): TrainingExample {

        if (!req.body.item1) throw new ValidationError(400, `No item1 provided`)
        if (!req.body.item2) throw new ValidationError(400, `No item2 provided`)
        if (!req.body.label) throw new ValidationError(400, `No label provided`)
        if (req.body.label != "before" && req.body.label != "after") throw new ValidationError(400, "Label must be either 'before' or 'after'")

        return new TrainingExample(req.body.item1, req.body.item2, req.body.label, moment().format("YYYYMMDD"))
    }
}

export type Label = "before" | "after"