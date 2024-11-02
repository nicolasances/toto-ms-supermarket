import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ListItem } from "../model/ListItem";
import { LocationListItem } from "../model/LocationListItem";
import request from "request";

export class SupermarketMLModel {

    endpoint: string;
    execContext: ExecutionContext;
    cid?: string;
    token: string;

    constructor(token: string, execContext: ExecutionContext) {
        this.endpoint = process.env["SUPITO_API_ENDPOINT"]!
        this.execContext = execContext;
        this.cid = execContext.cid;
        this.token = token;
    }

    /**
     * Predicts the position of the specified item within the Location List. 
     * 
     * The Location List is assumed to be already sorted. 
     * This algorithm goes through the elements of the Location List one by one and stops as soon as the item is "before" the current 
     * item in the location list. 
     * 
     * @param item the item for which the position needs to be predicted
     * @param locationList the location list the item will be added to
     * 
     * @returns a Promise with a number (predicted position index)
     */
    async predictItemPosition(item: ListItem, locationList: LocationListItem[]): Promise<number> {

        if (locationList.length == 0) return 0

        for (let otherItem of locationList) {

            const isBefore = await this.isItemBefore(item.name, otherItem.name);

            if (isBefore) return otherItem.index;
        }

        return locationList.length;
    }

    /** 
     * Returns true if the Supito models predicts that item is before otherItem
     * 
     * @param item the first item
     * @param otherItem the second item
     * @returns 
     */
    async isItemBefore(item: string, otherItem: string): Promise<boolean> {

        return new Promise((success, failure) => {

            request({
                uri: `${this.endpoint}/predict`,
                method: 'POST',
                headers: {
                    'x-correlation-id': this.cid,
                    'Authorization': `Bearer ${this.token}`
                },
                body: {
                    items: [item, otherItem]
                }
            }, (err: any, resp: any, body: any) => {

                if (err) {
                    console.log(err)
                    failure(err);
                }
                else {
                    
                    const parsedResponse = JSON.parse(body)
                    
                    // Check the probability answered
                    const beforeProba = parsedResponse.prediction;

                    // The item is before otherItem if the probability is above 50%
                    success(beforeProba > 0.5)
                }

            })
        })

    }
}