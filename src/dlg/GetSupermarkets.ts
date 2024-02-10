import { Request } from "express";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";

export class GetSupermarkets implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

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