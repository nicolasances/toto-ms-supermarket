import { Supermarket } from "../model/Supermarket";

const SUPERMARKETS = {
    "1": new Supermarket("Super Brugsen", "Solrød Strand", "1"),
    "2": new Supermarket("Lidl", "Solrød Strand", "2"),
    "3": new Supermarket("Føtex", "Fisketorvet", "3"),
} as any

export class SupermarketStore {

    getSupermarkets(): { supermarkets: Supermarket[] } {
        return {
            supermarkets: Object.values(SUPERMARKETS)
        }
    }

    async getSupermarket(id: string): Promise<Supermarket> {
        return SUPERMARKETS[id] as Supermarket
    }
}