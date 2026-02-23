
export interface TotoPathOptions {
    /**
     * Allows to override the auth configuration on a path level
     */
    noAuth?: boolean, 
    /**
     * Only for stream GET paths, allows to set the content type of the response
     */
    contentType?: string,

    /**
     * Optional extra headers to add to the response
     */
    headers?: Record<string, string>,

    /**
     * Pass true if you want to ignore the base path configured in the controller
     * Default is false
     * 
     * @example
     * If the controller has a base path of /msname and the path configured here is /pippo
     * then the full path will be /msname/pippo
     *
     * If ignoreBasePath is set to true, then the full path will be /pippo
     * 
     * This is useful for health check endpoints that might need to be outside of the base path
     */
    ignoreBasePath?: boolean

    /**
     * Pass true if you want to make sure that all typical headers and content-type needed for SSE are set. 
     */
    sseEndpoint?: boolean;

}