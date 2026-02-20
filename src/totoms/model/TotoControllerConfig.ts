import { Db, MongoClient } from "mongodb";
import { SecretsManager, TotoRuntimeError } from "..";
import { APIOptions } from "./APIConfiguration";

export abstract class TotoControllerConfig {

    protected mongoHost: string | undefined;
    protected mongoUser: string | undefined;
    protected mongoPwd: string | undefined;

    protected jwtSigningKey: string | undefined;
    protected expectedAudience: string | undefined;
    protected secretsManager: SecretsManager;

    public totoRegistryEndpoint: string | undefined;

    private static mongoClient: MongoClient | null = null;
    private static mongoClientPromise: Promise<MongoClient> | null = null;

    constructor(secretsManager: SecretsManager) {
        this.secretsManager = secretsManager;
    }

    /**
     * Loads the configurations and returns a Promise when done
     */
    async load(): Promise<any> {

        // If secrets are already loaded, skip
        if (this.mongoHost && this.jwtSigningKey && this.expectedAudience && this.totoRegistryEndpoint) {
            return;
        }

        let promises = [];

        promises.push(this.secretsManager.getSecret('mongo-host').then((value) => {
            this.mongoHost = value;
        }));
        promises.push(this.secretsManager.getSecret('jwt-signing-key').then((value) => {
            this.jwtSigningKey = value;
        }));
        promises.push(this.secretsManager.getSecret('toto-expected-audience').then((value) => {
            this.expectedAudience = value;
        }));
        promises.push(this.secretsManager.getSecret('toto-registry-endpoint').then((value) => {
            this.totoRegistryEndpoint = value;
        }));

        // If Mongo is needed, load the Mongo credentials
        if (this.getMongoSecretNames() != null && this.getMongoSecretNames() != undefined) {

            promises.push(this.secretsManager.getSecret(this.getMongoSecretNames()!.userSecretName).then((value) => {
                this.mongoUser = value;
            }));
            promises.push(this.secretsManager.getSecret(this.getMongoSecretNames()!.pwdSecretName).then((value) => {
                this.mongoPwd = value;
            }));
        }

        await Promise.all(promises);

    }

    public setSecretsManager(secretsManager: SecretsManager) { this.secretsManager = secretsManager; }

    /**
     * Abstract method to be implemented by subclasses to return the names of the secrets
     * used for MongoDB authentication.
     * 
     * Not all services may need MongoDB, so this method can return null.
     * 
     * @return An object containing the user and password secret names, or null if not applicable.
     *  - userSecretName: string    - The name of the secret (as configured in the Secret Manager) for the MongoDB user.
     *  - pwdSecretName: string     - The name of the secret for the MongoDB password.
     */
    abstract getMongoSecretNames(): { userSecretName: string, pwdSecretName: string } | null;

    /**
     * Returns the Validator Properties
     */
    abstract getProps(): APIOptions

    /**
     * Return the JWT Token Signing Key for custom tokens
     */
    getSigningKey(): string { return this.jwtSigningKey!; }

    /**
     * Returns the expected audience. 
     * The expected audience is used when verifying the Authorization's header Bearer JWT token.
     * The audience is extracted from the token and compared with the expected audience, to make sure 
     * that the token was issued for the correct purpose (audience).
     */
    getExpectedAudience(): string { return String(this.expectedAudience); }

    getTotoRegistryEndpoint(): string { return String(this.totoRegistryEndpoint); }

    /**
     * Returns a connected MongoDB Database instance.
     * 
     * @param dbName the name of the DB. IMPORTANT! Must coincide with the authentication db.
     * If the two do not coincide, use the getMongoClient() method first and then use the client yourself to get the desired Db.
     * 
     * @returns the requested Db instance
     */
    async getMongoDb(dbName: string): Promise<Db> {

        const client = await this.getMongoClient(dbName);

        return client.db(dbName);
    }

    /**
     * Returns a connected Mongo Client.
     * 
     * @param dbName the authentication DB
     * @returns the Mongo Client
     */
    async getMongoClient(dbName: string): Promise<MongoClient> {

        if (TotoControllerConfig.mongoClient) return TotoControllerConfig.mongoClient;

        // If connection is in progress, wait for it
        if (TotoControllerConfig.mongoClientPromise) return TotoControllerConfig.mongoClientPromise;

        const mongoUrl = `mongodb://${this.mongoUser}:${this.mongoPwd}@${this.mongoHost}:27017/${dbName}`;

        TotoControllerConfig.mongoClientPromise = new MongoClient(mongoUrl, {
            serverSelectionTimeoutMS: 5000,    // Fail fast on network issues
            socketTimeoutMS: 30000,            // Kill hung queries
            maxPoolSize: 80,                   // Up to 80 connections in the pool
        }).connect().then(client => {

            TotoControllerConfig.mongoClient = client;
            TotoControllerConfig.mongoClientPromise = null;

            return client;

        }).catch(error => {

            TotoControllerConfig.mongoClientPromise = null;

            throw error;
        });

        return TotoControllerConfig.mongoClientPromise;
    }

    /**
     * Closes the MongoDB connection pool.
     * Call this during application shutdown.
     */
    static async closeMongoClient(): Promise<void> {

        if (TotoControllerConfig.mongoClient) {

            await TotoControllerConfig.mongoClient.close();

            TotoControllerConfig.mongoClient = null;
        }
    }

}

const shutdown = async () => {

    console.log('Shutting down gracefully...');

    await TotoControllerConfig.closeMongoClient();

    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);