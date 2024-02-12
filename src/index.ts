import { TotoAPIController } from "toto-api-controller";
import { ControllerConfig } from "./Config";
import { AddItemToList } from "./dlg/AddItemToList";
import { UpdateItem } from "./dlg/UpdateItem";
import { GetItems } from "./dlg/GetItems";
import { GetSupermarkets } from "./dlg/GetSupermarkets";
import { EventHandlerHook } from "./evt/EventHandlerHook";
import { GetLocationList } from "./dlg/GetLocationList";
import { UpdateLocationListItem } from "./dlg/UpdateLocationListItem";

const api = new TotoAPIController("toto-ms-supermarket", new ControllerConfig())

api.path('GET', '/list/items', new GetItems())
api.path('POST', '/list/items', new AddItemToList())
api.path('PUT', '/list/items/:id', new UpdateItem())

api.path('GET', '/supermarkets', new GetSupermarkets())
api.path('GET', '/supermarkets/:id/items', new GetLocationList())
api.path('PUT', '/supermarkets/:sid/items/:id', new UpdateLocationListItem())

api.path('POST', '/events', new EventHandlerHook())

api.init().then(() => {
    api.listen()
});