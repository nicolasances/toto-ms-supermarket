import { TotoAPIController } from "toto-api-controller";
import { ControllerConfig } from "./Config";
import { AddItemToList } from "./dlg/AddItemToList";

const api = new TotoAPIController("toto-ms-supermarket", new ControllerConfig())

api.path('POST', '/list/items', new AddItemToList())

api.init().then(() => {
    api.listen()
});