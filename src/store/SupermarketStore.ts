import { Supermarket } from "../model/Supermarket";


export class SupermarketStore {

    getSupermarkets(): { supermarkets: Supermarket[] } {
        return {
            supermarkets:
                [
                    { name: "Super Brugsen", location: "Solrød Strand" },
                    { name: "Lidl", location: "Solrød Strand" },
                    { name: "Føtex", location: "Fisketorvet" },
                ]
        }
    }
}