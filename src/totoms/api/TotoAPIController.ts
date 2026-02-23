import bodyParser from 'body-parser'
import busboy from 'connect-busboy'
import fs from 'fs-extra';
import express, { Express, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';

import { Logger } from '../logger/TotoLogger'
import { TotoControllerConfig } from '../model/TotoControllerConfig'
import { ValidationError, Validator } from '../validation/Validator';
import { TotoDelegate } from '../model/TotoDelegate';
import { SmokeDelegate } from '../dlg/SmokeDelegate';
import { TotoRuntimeError } from '../model/TotoRuntimeError';
import { TotoPathOptions } from '../model/TotoPathOptions';
import path from 'path';
import { TotoRegistryAPI } from '../integration/TotoRegistryAPI';
import { RegistryCache } from '../integration/RegistryCache';
import { TotoEnvironment } from '..';
import { OpenAPISpecification } from '../model/APIConfiguration';
import { OpenAPIDocsJSONDelegate } from '../dlg/OpenAPIDocsJSONDelegate';

export class TotoControllerOptions {
    debugMode?: boolean = false
    basePath?: string = undefined   // Use to prepend a base path to all API paths, e.g. '/api/v1' or '/expenses/v1'
    port?: number                   // Use to define the port on which the Express app will listen. Default is 8080
    openAPISpecification?: OpenAPISpecification = undefined
}

export interface TotoControllerProps {
    apiName: string;
    environment: TotoEnvironment;
    config: TotoControllerConfig;
}

/**
 * This is an API controller to Toto APIs
 * It provides all the methods to create an API and it's methods & paths, to create the documentation automatically, etc.
 * Provides the following default paths:
 * '/'            : this is the default SMOKE (health check) path
 * '/publishes'   : this is the path that can be used to retrieve the list of topics that this API publishes events to
 */
export class TotoAPIController {

    app: Express;
    apiName: string;
    props: TotoControllerProps;
    options: TotoControllerOptions;

    /**
     * The constructor requires the express app
     * Requires:
     * - apiName              : (mandatory) - the name of the api (e.g. expenses)
     * - config               : (mandatory) - a TotoControllerConfig instance
     */
    constructor(props: TotoControllerProps, options: TotoControllerOptions = {}) {

        this.app = express();
        this.props = props;
        this.apiName = props.apiName;
        this.options = {
            debugMode: options.debugMode ?? false,
            basePath: options.basePath,
            port: options.port ?? 8080
        };

        const logger = Logger.getInstance();

        // Log some configuration properties
        if (options.debugMode) logger.compute("INIT", `[TotoAPIController Debug] - Config Properties: ${JSON.stringify(this.props.config.getProps())}`)

        // Initialize the basic Express functionalities
        this.app.use(function (req: any, res: any, next: any) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-correlation-id, x-msg-id, auth-provider, x-app-version, x-client, x-client-id");
            res.header("Access-Control-Allow-Methods", "OPTIONS, GET, PUT, POST, DELETE");
            next();
        });

        this.app.use(bodyParser.json());
        this.app.use(busboy());
        this.app.use(express.static(path.join(__dirname, 'public')));

        // Add the standard Toto paths
        // Add the basic SMOKE api and /health endpoint. 
        const smokeEndpoint = new SmokeDelegate(null as any, this.props.config);
        smokeEndpoint.apiName = this.apiName; // Inject apiName

        this.path('GET', '/', smokeEndpoint, { noAuth: true, contentType: 'application/json' });
        this.path('GET', '/', smokeEndpoint, { noAuth: true, contentType: 'application/json', ignoreBasePath: true });
        this.path('GET', '/health', smokeEndpoint, { noAuth: true, contentType: 'application/json', ignoreBasePath: true });

        // Create an OpenAPI docs endpoint if the spec is available
        if (options?.openAPISpecification?.localSpecsFilePath) {
            
            const apiDocsCorrectedPath = this.options.basePath ? this.options.basePath.replace(/\/$/, '').trim() + '/apidocs' : '/apidocs';
            
            const swaggerDocument = yaml.load( fs.readFileSync(options.openAPISpecification.localSpecsFilePath, 'utf8') ) as swaggerUi.JsonObject;

            this.app.use(apiDocsCorrectedPath, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
            this.path('GET', `/jsondocs`, new OpenAPIDocsJSONDelegate(null as any, this.props.config, swaggerDocument), { noAuth: true, contentType: 'application/json' });
        }

        // Bindings
        this.staticContent = this.staticContent.bind(this);
        this.fileUploadPath = this.fileUploadPath.bind(this);
        this.path = this.path.bind(this);
    }

    async init() {

        // Register this API with Toto API Registry
        const registrationResponse = await new TotoRegistryAPI(this.props.config).registerAPI({ apiName: this.apiName, basePath: this.options.basePath?.replace("/", ""), hyperscaler: this.props.environment.hyperscaler });

        Logger.getInstance().compute("INIT", `API ${this.apiName} successfully registered with Toto API Registry: ${JSON.stringify(registrationResponse)}`, 'info');

        // Download all Toto API Endpoints and cache them 
        RegistryCache.getInstance(this.props.config).refresh();

    }

    /**
     * This method will register the specified path to allow access to the static content in the specified folder
     * e.g. staticContent('/img', '/app/img')
     */
    staticContent(path: string, folder: string, options?: TotoPathOptions) {

        // If a basepath is defined, prepend it to the path
        // Make sure that the basePath does not end with "/". If it does remove it. 
        const correctedPath = (this.options.basePath && (!options || !options.ignoreBasePath)) ? this.options.basePath.replace(/\/$/, '').trim() + path : path;

        this.app.use(correctedPath, express.static(folder));

    }

    /**
     * 
     * @param {string} path the path to which this API is reachable
     * @param {function} delegate the delegate that will handle this call
     * @param {object} options options to configure this path: 
     *  - contentType: (OPT, default null) provide the Content-Type header to the response
     */
    streamGET(path: string, delegate: TotoDelegate<any, any>, options?: TotoPathOptions) {

        // If a basepath is defined, prepend it to the path
        // Make sure that the basePath does not end with "/". If it does remove it. 
        const correctedPath = (this.options.basePath && (!options || !options.ignoreBasePath)) ? this.options.basePath.replace(/\/$/, '').trim() + path : path;

        const validator = new Validator(this.props.config, this.options.debugMode || false);
        const logger = Logger.getInstance();

        this.app.route(correctedPath).get((req: Request, res: Response, next) => {

            validator.validate(req, options).then((userContext) => {

                const cid = String(req.headers['x-correlation-id']);
                delegate.setCorrelationId(cid);

                logger.apiIn(cid, 'GET', correctedPath);

                const totoRequest =  delegate.parseRequest(req);

                // Execute the GET
                delegate.processRequest(totoRequest, userContext).then((stream) => {

                    // SSE Configuration
                    if (options && options.sseEndpoint) {
                        res.header('Content-Type', "text/event-stream");
                        res.header('Cache-Control', "no-cache");
                        res.header('Connection', "keep-alive");
                        res.header('X-Accel-Buffering', "no"); // Typically used for NGINX optimization (avoids buffering)
                    }

                    // Add any additional configured headers (overriding)
                    if (options && options.contentType) res.header('Content-Type', options.contentType);
                    if (options && options.headers) {
                        for (const [key, value] of Object.entries(options.headers)) {
                            res.header(key, value);
                        }
                    }

                    // stream must be a stream: e.g. var stream = bucket.file('Toast.jpg').createReadStream();
                    res.writeHead(200);

                    if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();

                    stream.on('data', (data: any) => {
                        res.write(data);
                    });

                    stream.on('end', () => {
                        res.end();
                    });
                    
                }, (err) => {
                    // Log
                    logger.compute(req.headers['x-correlation-id'], err, 'error');
                    // If the err is a {code: 400, message: '...'}, then it's a validation error
                    if (err != null && err.code == '400') res.status(400).type('application/json').send(err);
                    // Failure
                    else res.status(500).type('application/json').send(err);
                });

            });
        });
    }

    /**
     * Adds a path that support uploading files
     *  - path:     the path as expected by express. E.g. '/upload'
     */
    fileUploadPath(path: string, delegate: TotoDelegate<any, any>, options?: TotoPathOptions) {

        // If a basepath is defined, prepend it to the path
        // Make sure that the basePath does not end with "/". If it does remove it. 
        const correctedPath = (this.options.basePath && (!options || !options.ignoreBasePath)) ? this.options.basePath.replace(/\/$/, '').trim() + path : path;

        const validator = new Validator(this.props.config, this.options.debugMode || false);
        const logger = Logger.getInstance();

        this.app.route(correctedPath).post(async (req, res, next) => {

            logger.apiIn(req.headers['x-correlation-id'], 'POST', correctedPath);

            // Validating
            const userContext = await validator.validate(req);

            let fstream;
            let filename: string;
            let filepath: string;
            let additionalData = {} as any;

            req.pipe(req.busboy);

            req.busboy.on('field', (fieldname, value, metadata) => {
                additionalData[fieldname] = value;
            });

            req.busboy.on('file', (fieldname, file, metadata) => {

                logger.compute(req.headers['x-correlation-id'], 'Uploading file ' + metadata.filename, 'info');

                // Define the target dir
                let dir = __dirname + '/app-docs';

                // Save the data 
                filename = metadata.filename;
                filepath = dir + '/' + metadata.filename

                // Ensure that the dir exists
                fs.ensureDirSync(dir);

                // Create the file stream
                fstream = fs.createWriteStream(dir + '/' + metadata.filename);

                // Pipe the file data to the stream
                file.pipe(fstream);

            });

            req.busboy.on("finish", () => {

                const totoRequest = delegate.parseRequest({
                    query: req.query,
                    params: req.params,
                    headers: req.headers,
                    body: { filepath: filepath, filename: filename, ...additionalData }
                } as Request);

                delegate.processRequest(totoRequest, userContext).then((data) => {
                    // Success
                    res.status(200).type('application/json').send(data);

                }, (err) => {
                    // Log
                    logger.compute(req.headers['x-correlation-id'], err, 'error');
                    // If the err is a {code: 400, message: '...'}, then it's a validation error
                    if (err != null && err.code == '400') res.status(400).type('application/json').send(err);
                    // Failure
                    else res.status(500).type('application/json').send(err);
                });
            })

        });

        // Log the added path
        logger.compute("INIT", 'Successfully added method ' + 'POST' + ' ' + correctedPath);
    }

    /**
     * Registers a new endpoint to receive Pub/Sub PUSH messages. 
     * 
     * This is ONLY to be used by Pub/Sub implementations that support PUSH mechanisms (e.g. GCP Pub/Sub, AWS SNS, etc.). 
     * 
     * @param path The path is the endpoint path suffix (e.g. '/events/transactions' that would be appended to the base path of the API controller and used for all events on transactions)
     * @param handler The handler that will process the incoming Pub/Sub messages
     * @param options 
     */
    registerPubSubMessageEndpoint(path: string, handler: (req: Request) => Promise<any>, options?: TotoPathOptions) {

        // If a basepath is defined, prepend it to the path
        // Make sure that the basePath does not end with "/". If it does remove it. 
        const correctedPath = (this.options.basePath && (!options || !options.ignoreBasePath)) ? this.options.basePath.replace(/\/$/, '').trim() + path : path;

        const logger = Logger.getInstance();

        const handleRequest = async (req: Request, res: Response) => {

            const cid = req.get('x-correlation-id') || uuidv4();

            try {

                // Log the fact that a call has been received
                logger.compute(cid, `Received event on path ${path}`);

                // Use the handler
                const data = await handler(req);

                // Log response
                logger.compute(cid, `Event on path ${path} processed with result: ${JSON.stringify(data)}`);

                res.status(200).type('application/json').send(data);


            } catch (error) {

                logger.compute(cid, `${error}`, "error")

                if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                    res.status(error.code).type("application/json").send(error)
                }
                else {
                    console.log(error);
                    res.status(500).type('application/json').send(error);
                }
            }
        }

        // Register the route with the custom middleware
        this.app.post(correctedPath, parseTextAsJson, handleRequest);

        // Log the added path
        logger.compute("INIT", "Successfully added event handler POST " + correctedPath);
    }

    /**
     * Add a path to the app.
     * Requires:
     *  - method:   the HTTP method. Can be GET, POST, PUT, DELETE
     *  - path:     the path as expected by express. E.g. '/sessions/:id'
     *  - delegate: the delegate that exposes a do() function. Note that the delegate will always receive the entire req object
     *  - options:  optional options to path
     */
    path(method: string, path: string, delegate: TotoDelegate<any, any>, options?: TotoPathOptions) {

        // If a basepath is defined, prepend it to the path
        // Make sure that the basePath does not end with "/". If it does remove it. 
        const correctedPath = (this.options.basePath && (!options || !options.ignoreBasePath)) ? this.options.basePath.replace(/\/$/, '').trim() + path : path;

        const validator = new Validator(this.props.config, this.options.debugMode || false);
        const logger = Logger.getInstance();

        const handleRequest = async (req: Request, res: Response) => {

            const cid = String(req.headers['x-correlation-id']);

            delegate.setCorrelationId(cid);

            try {

                // Log the fact that a call has been received
                logger.apiIn(cid, method, correctedPath);

                // Validating
                const userContext = await validator.validate(req, options);

                // Conver the request into the format expected by the delegate 
                const totoRequest =  delegate.parseRequest(req);

                // Execute the GET
                const data = await delegate.processRequest(totoRequest, userContext);

                let contentType = 'application/json'
                let dataToReturn = data;

                res.status(200).type(contentType).send(dataToReturn);


            } catch (error) {

                logger.compute(cid, `${error}`, "error")

                if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                    res.status(error.code).type("application/json").send(error)
                }
                else {
                    console.log(error);
                    res.status(500).type('application/json').send(error);
                }
            }
        }

        if (method == "GET") this.app.get(correctedPath, handleRequest);
        else if (method == "POST") this.app.post(correctedPath, handleRequest);
        else if (method == "PUT") this.app.put(correctedPath, handleRequest);
        else if (method == "DELETE") this.app.delete(correctedPath, handleRequest);
        else this.app.get(correctedPath, handleRequest);

        // Log the added path
        logger.compute("INIT", 'Successfully added method ' + method + ' ' + correctedPath);
    }

    /**
     * Starts the ExpressJS app by listening on the standard port defined for Toto microservices
     */
    listen() {

        const validator = new Validator(this.props.config, this.options.debugMode || false);
        const logger = Logger.getInstance();

        if (!validator) {
            logger.compute("INIT", "Waiting for the configuration to load...");
            setTimeout(() => { this.listen() }, 300);
            return;
        }

        this.app.listen(this.options.port, () => {
            logger.compute("INIT", `Microservice listening on port ${this.options.port}`, 'info');
        });

    }
}


// Middleware to handle text/plain content type from e.g. AWS SNS
// AWS SNS sends SubscriptionConfirmation with text/plain but the body is actually JSON
const parseTextAsJson = (req: Request, res: Response, next: any) => {

    const contentType = req.get('content-type') || '';

    // If it's text/plain (e.g. AWS SNS does that), parse it as JSON
    if (contentType.includes('text/plain')) {

        bodyParser.text({ type: 'text/plain' })(req, res, (err) => {

            if (err) return next(err);

            try {
                // Parse the text body as JSON
                if (typeof req.body === 'string') {
                    req.body = JSON.parse(req.body);
                }
                next();
            } catch (parseError) {
                console.log(`Failed to parse SNS text/plain body as JSON: ${parseError}`, 'error');
                next(parseError);
            }
        });

    }
    else {
        // For other content types, continue normally (bodyParser.json() already handled it)
        next();
    }
};