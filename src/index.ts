import { TotoMicroservice, TotoMicroserviceConfiguration, getHyperscalerConfiguration, SupportedHyperscalers } from "totoms";
import { ControllerConfig } from "./Config";
import { AddItemToList } from "./dlg/AddItemToList";
import { UpdateItem } from "./dlg/UpdateItem";
import { GetItems } from "./dlg/GetItems";
import { GetSupermarkets } from "./dlg/GetSupermarkets";
import { GetLocationList } from "./dlg/GetLocationList";
import { TickLocationItem } from "./dlg/TickLocationItem";
import { DeleteItem } from "./dlg/DeleteItem";
import { GetNames } from "./dlg/GetNames";
import { CloseShoppingList } from "./dlg/CloseShoppingList";
import { SaveExample } from "./dlg/games/SaveExample";
import { NextRound } from "./dlg/games/NextRound";
import { StartBackup } from "./dlg/backup/StartBackup";
import { GetNextPredictedGroceriesDay } from "./dlg/GetNextPredictedGroceriesDay";
import { GetPreferences } from "./dlg/GetPreferences";
import { SetPreferences } from "./dlg/SetPreferences";
import { OnItemAdded } from "./evt/handlers/OnItemAdded";
import { OnItemDeleted } from "./evt/handlers/OnItemDeleted";
import { OnLocationListClosed } from "./evt/handlers/OnLocationListClosed";
import { SuppieAgent } from "agent/SuppieAgent";

const config: TotoMicroserviceConfiguration = {
    serviceName: "toto-ms-supermarket",
    environment: {
        hyperscaler: (process.env.HYPERSCALER as SupportedHyperscalers) || "gcp",
        hyperscalerConfiguration: getHyperscalerConfiguration()
    },
    customConfiguration: ControllerConfig,
    apiConfiguration: {
        openAPISpecification: { localSpecsFilePath: "./openapi.yaml" },
        apiEndpoints: [
            { method: 'GET', path: '/list/items', delegate: GetItems },
            { method: 'POST', path: '/list/items', delegate: AddItemToList },
            { method: 'PUT', path: '/list/items/:id', delegate: UpdateItem },
            { method: 'DELETE', path: '/list/items/:id', delegate: DeleteItem },

            { method: 'GET', path: '/supermarkets', delegate: GetSupermarkets },
            { method: 'GET', path: '/supermarkets/:id/items', delegate: GetLocationList },
            { method: 'PUT', path: '/supermarkets/:sid/items/:id/tick', delegate: TickLocationItem },
            { method: 'POST', path: '/supermarkets/:sid/close', delegate: CloseShoppingList },

            { method: 'GET', path: '/names', delegate: GetNames },

            { method: 'GET', path: '/predictions/nesu', delegate: GetNextPredictedGroceriesDay },

            { method: 'GET', path: '/preferences', delegate: GetPreferences },
            { method: 'POST', path: '/preferences', delegate: SetPreferences },

            { method: 'POST', path: '/games/sort/examples', delegate: SaveExample },
            { method: 'GET', path: '/games/sort/next', delegate: NextRound },

            { method: 'POST', path: '/backup', delegate: StartBackup },
        ],
    },
    messageBusConfiguration: {
        topics: [
            { logicalName: "supermarket", secret: "topic-name-supermarket" }
        ],
        messageHandlers: [
            OnItemAdded,
            OnItemDeleted,
            OnLocationListClosed
        ]
    },
    agentsConfiguration: {
        agents: [
            SuppieAgent
        ]
    }
};

TotoMicroservice.init(config).then(microservice => {
    microservice.start();
});