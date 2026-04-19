import { TotoControllerConfig, APIOptions, SecretsManager, AUTH_PROVIDERS } from "totoms";

const dbName = 'supermarket';
const collections = {
    items: 'items',
    locationLists: 'locationLists', 
    archivedLists: 'archivedLists', 
    trainingExamples: 'trainingExamples',
    settings: 'settings'
};

export class ControllerConfig extends TotoControllerConfig {

    constructor(secretsManager: SecretsManager) {
        super(secretsManager);
    }

    async load(): Promise<any> {
        // Call parent load to handle mongo secrets
        await super.load();
    }

    getMongoSecretNames(): { userSecretName: string; pwdSecretName: string; } | null {
        return {
            userSecretName: 'toto-ms-supermarket-mongo-user',
            pwdSecretName: 'toto-ms-supermarket-mongo-pswd'
        };
    }

    getProps(): APIOptions {
        return {
            customAuthProvider: AUTH_PROVIDERS.toto
        };
    }

    getDBName() { return dbName }
    getCollections() { return collections }

}
