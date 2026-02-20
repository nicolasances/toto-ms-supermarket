
import { APIOptions } from "../model/APIConfiguration";
import { Request } from "express";
import * as jwt from 'jsonwebtoken';
import { UserContext } from "../model/UserContext";
import { googleAuthCheck } from "./GoogleAuthCheck";
import { TotoControllerConfig } from "../model/TotoControllerConfig";
import { AUTH_PROVIDERS } from "../model/AuthProviders";
import { TotoPathOptions } from "../model/TotoPathOptions";
import { Logger } from "../logger/TotoLogger";
import { decodeJWT } from "../util/TokenUtil";
import { SecretsManager } from "../util/CrossCloudSecret";

const extractTokenFromAuthHeader = (authorizationHeader: string): string => {
  return String(authorizationHeader).substring('Bearer'.length + 1);
}

/**
 * Finds out what the Auth Provider of the JWT token is. 
 * For tokens created by toto-auth, the auth provider is provided in the JWT token as a specific "authProvider" field.
 * For tokens created by other IDPs, look at the iss field of the JWT Token
 * 
 * @param tokenJson the JWT token as a json object
 * @returns the auth provider based on the JWT token
 */
const getAuthProvider = (tokenJson: any): string => {

  if (tokenJson.authProvider) return tokenJson.authProvider;

  if (tokenJson.iss && (tokenJson.iss.indexOf("accounts.google.com") > -1)) return AUTH_PROVIDERS.google;

  return "custom";

}

/**
 * Base Validator for HTTP Requests 
 */
export class Validator {

  props: APIOptions;
  config: TotoControllerConfig;
  debugMode: boolean

  /**
   * 
   * @param {object} props Propertiess
   * @param {object} logger the toto logger
   */
  constructor(config: TotoControllerConfig, debugMode: boolean = false) {
    this.props = config.getProps();
    this.config = config;
    this.debugMode = debugMode;
  }

  /**
   * Validates the provided request
   * @param req Request the Express request
   * @returns a Promise
   */
  async validate(req: Request, options?: TotoPathOptions): Promise<UserContext | undefined> {

    // Extraction of the headers
    // Authorization & AuthProvider
    let authorizationHeader = req.headers['authorization'] ?? req.headers['Authorization'];

    // Correlation ID 
    let cid: string = String(req.headers['x-correlation-id']) ?? "";

    const logger = Logger.getInstance();

    if (this.debugMode) logger.compute(cid, `[Validator Debug] - Validation starting with Config props: ${JSON.stringify(this.props)}`)

    // App Version
    let appVersion = req.headers['x-app-version'];

    // Checking Correlation ID
    if (this.props.noCorrelationId == null || this.props.noCorrelationId == false) {

      if (cid == null) throw new ValidationError(400, "No Correlation ID was provided")

    }

    // Checking minimum app version
    // The minimum app version must be in the format major.minor.patch
    if (this.props.minAppVersion) {

      if (appVersion && appVersion < this.props.minAppVersion) throw new ValidationError(412, "The App Version is not compatible with this API", 'app-version-not-compatible')
    }

    // Checking authorization
    // If the config doesn't say to bypass authorization, look for the Auth header
    if (this.props.noAuth == null || this.props.noAuth == false) {

      // Check if Path Options allow for this route to be auth free
      if (!options || options.noAuth !== true) {

        if (!authorizationHeader) throw new ValidationError(401, "No Authorization Header provided")

        // Decode the JWT token
        const decodedToken = decodeJWT(String(authorizationHeader))

        // Retrieve the auth provider from the JWT Token
        const authProvider = getAuthProvider(decodedToken);

        if (this.debugMode === true) logger.compute(cid, `[Validator Debug] - Auth Provider: [${authProvider}]`)

        // Retrieve the audience that the token will be validated against
        // That is the audience that is expected to be found in the token
        const expectedAudience = this.config.getExpectedAudience();

        if (this.debugMode === true) logger.compute(cid, `[Validator Debug] - Expected Audience: [${expectedAudience}]`)

        if (authProvider.toLowerCase() == AUTH_PROVIDERS.toto) {

          if (this.debugMode === true) logger.compute(cid, `[Validator Debug] - Using Toto Auth Provider]. Verifying token`);

          // Get the Toto JWT signing key
          const key = this.config.getSigningKey();

          // Verify the token using jsonwebtoken
          const jwtPayload = jwt.verify(extractTokenFromAuthHeader(String(authorizationHeader)), key) as any;

          return {
            email: jwtPayload.user,
            authProvider: jwtPayload.authProvider,
            userId: jwtPayload.user
          }

        }
        else if (authProvider.toLowerCase() == AUTH_PROVIDERS.google) {

          if (this.debugMode === true) logger.compute(cid, `[Validator Debug] - Using Google Auth Provider`)

          const googleAuthCheckResult = await googleAuthCheck(cid, authorizationHeader, String(expectedAudience), logger, this.debugMode)

          if (this.debugMode === true) logger.compute(cid, `[Validator Debug] - UserContext created by Google Auth Check: [${JSON.stringify(googleAuthCheck)}]`)

          return googleAuthCheckResult;
        }
        else {
          if (this.debugMode === true) logger.compute(cid, `[Validator Debug] - UserContext will be null as no Auth Provider could be determined.`)
        }

      }

    }

    return undefined

  }
}

export class ValidationError extends Error {

  code: number;
  message: string;
  subcode: string | undefined;

  constructor(code: number, message: string, subcode?: string) {
    super()

    this.code = code;
    this.message = message;
    this.subcode = subcode;
  }
}

export class LazyValidator extends Validator {

  constructor() {
    super(new ConfigMock());
  }

}

export class ConfigMock extends TotoControllerConfig {

  getMongoSecretNames(): { userSecretName: string; pwdSecretName: string; } | null {
    throw new Error("Method not implemented.");
  }

  constructor() {
    super(new SecretsManager({ hyperscaler: "aws", hyperscalerConfiguration: { awsRegion: "eu-north-1", environment: "dev" } }));
  }

  getSigningKey(): string {
    return "fake-key";
  }

  async load(): Promise<any> {
    return {}
  }
  getProps(): APIOptions {
    return {}
  }
  getExpectedAudience(): string {
    return ""
  }

}