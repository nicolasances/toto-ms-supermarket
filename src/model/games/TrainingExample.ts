import { Request } from "express"
import moment from "moment-timezone"
import { ValidationError } from "totoms"


export class TrainingExample {

    id?: string
    item1: string
    item2: string
    label: Label
    date: string
    supermarketId: string

    constructor(item1: string, item2: string, label: Label, date: string, supermarketId: string) {
        this.item1 = item1;
        this.item2 = item2;
        this.label = label;
        this.date = date;
        this.supermarketId = supermarketId
    }

    static fromHttpRequest(req: Request): TrainingExample {

        if (!req.body.item1) throw new ValidationError(400, `No item1 provided`)
        if (!req.body.item2) throw new ValidationError(400, `No item2 provided`)
        if (!req.body.label) throw new ValidationError(400, `No label provided`)
        if (req.body.label != "before" && req.body.label != "after") throw new ValidationError(400, "Label must be either 'before' or 'after'")
        if (!req.body.supermarketId) throw new ValidationError(400, `Missing supermarket id`)

        return new TrainingExample(req.body.item1, req.body.item2, req.body.label, moment().format("YYYYMMDD"), req.body.supermarketId)
    }
}

export type Label = "before" | "after"