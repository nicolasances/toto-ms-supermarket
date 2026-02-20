import moment from "moment-timezone";
import jwt from 'jsonwebtoken';
import { TotoControllerConfig } from "..";

/**
 * Generates a new JWT token for the Toto service.
 * 
 * Important: the token represents a service, not a user. The user field is set to the name of the microservice (extracted from the config).
 * 
 * @param config the Toto Controller Config
 * @returns a JWT token
 */
export function newTotoServiceToken(config: TotoControllerConfig) {

    let exp = moment().tz("Europe/Rome").add(3, "hours").unix();

    let token = jwt.sign({ user: "toto-service", authProvider: "toto", exp: exp }, config.getSigningKey());

    return token;
}