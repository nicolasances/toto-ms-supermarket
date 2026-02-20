
import { TotoRegistryAPI, APIEndpoint } from "./TotoRegistryAPI";
import { Logger, TotoControllerConfig, TotoRuntimeError } from "..";

const DEFAULT_TTL_MINUTES = 30;

/**
 * Configuration options for the RegistryCache
 */
export interface RegistryCacheOptions {
    /**
     * Time-to-live in minutes before the cache is invalidated and refreshed
     * @default 30
     */
    ttlMinutes?: number;
}

/**
 * The Registry cache caches all the API endpoints registered in the Toto Registry.  
 * The cache is purely local and in-memory.
 * This is a singleton class - use RegistryCache.getInstance() to get the instance.
 */
export class RegistryCache {

    private static instance: RegistryCache | null = null;

    private cache: Map<string, APIEndpoint> = new Map();
    private lastRefreshTime: number = 0;
    private ttlMilliseconds: number;
    private registryAPI: TotoRegistryAPI;

    private constructor(config: TotoControllerConfig, options?: RegistryCacheOptions) {
        this.registryAPI = new TotoRegistryAPI(config);
        this.ttlMilliseconds = (options?.ttlMinutes ?? DEFAULT_TTL_MINUTES) * 60 * 1000;
    }

    /**
     * Gets the singleton instance of RegistryCache.
     * 
     * @param config the TotoControllerConfig
     * @param options optional cache configuration
     * @returns the singleton instance
     */
    static getInstance(config?: TotoControllerConfig, options?: RegistryCacheOptions): RegistryCache {
        if (!RegistryCache.instance) {
            
            if (!config) throw new TotoRuntimeError(500, "RegistryCache not initialized. Config is required on first call to getInstance(). This is a configuration error in your application.");
            
            RegistryCache.instance = new RegistryCache(config, options);
        }
        return RegistryCache.instance;
    }

    /**
     * Resets the singleton instance (useful for testing).
     */
    static resetInstance(): void {
        RegistryCache.instance = null;
    }

    /**
     * Gets an API endpoint from the cache by apiName.
     * If the cache is stale or empty, it will be refreshed first.
     * 
     * @param apiName the name of the API to retrieve
     * @returns the API endpoint or undefined if not found
     */
    async getEndpoint(apiName: string): Promise<APIEndpoint | undefined> {
        await this.refreshIfNeeded();
        return this.cache.get(apiName);
    }

    /**
     * Gets all cached API endpoints.
     * If the cache is stale or empty, it will be refreshed first.
     * 
     * @returns all cached API endpoints
     */
    async getAllEndpoints(): Promise<APIEndpoint[]> {
        await this.refreshIfNeeded();
        return Array.from(this.cache.values());
    }

    /**
     * Checks if the cache needs to be refreshed and refreshes it if necessary.
     * The cache is refreshed if:
     * - It's empty
     * - The TTL has expired
     */
    private async refreshIfNeeded(): Promise<void> {
        const now = Date.now();
        const isExpired = (now - this.lastRefreshTime) > this.ttlMilliseconds;
        const isEmpty = this.cache.size === 0;

        if (isEmpty || isExpired) {
            await this.refresh();
        }
    }

    /**
     * Forces a refresh of the cache by calling the TotoRegistryAPI.
     * This will fetch all API endpoints from the registry and update the cache.
     */
    async refresh(): Promise<void> {

        const logger = Logger.getInstance();

        try {
            const response = await this.registryAPI.getAPIs();

            // Clear the existing cache
            this.cache.clear();

            // Populate the cache with fresh data
            response.apis.forEach(api => {
                this.cache.set(api.apiName, api);
            });

            // Update the last refresh time
            this.lastRefreshTime = Date.now();

            logger?.compute("REFRESH", `Registry cache refreshed with ${this.cache.size} API endpoints`);
        } catch (error) {
            logger?.compute("REFRESH", `Failed to refresh registry cache: ${error}`);
            throw error;
        }
    }

    /**
     * Manually invalidates the cache, forcing the next access to refresh from the registry.
     */
    invalidate(): void {

        const logger = Logger.getInstance();
        this.lastRefreshTime = 0;
        logger?.compute("", 'Registry cache invalidated');
    }

    /**
     * Clears the cache completely.
     */
    clear(): void {

        const logger = Logger.getInstance();
        this.cache.clear();
        this.lastRefreshTime = 0;
        logger?.compute("", 'Registry cache cleared');
    }

    /**
     * Gets the number of cached API endpoints.
     * 
     * @returns the number of cached entries
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Checks if the cache is currently valid (not expired).
     * 
     * @returns true if the cache is valid, false otherwise
     */
    isValid(): boolean {
        const now = Date.now();
        return this.cache.size > 0 && (now - this.lastRefreshTime) <= this.ttlMilliseconds;
    }
}