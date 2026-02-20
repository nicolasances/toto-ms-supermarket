import { AUTH_PROVIDERS } from '..';

/**
 * Extracts the Bearer token from the HTTP Authorization header and decodes it
 * @param authorizationHeader HTTP Auth header
 * @returns a decoded JWT token as a json object
 */
export const decodeJWT = (authorizationHeader: string) => {

  const token = String(authorizationHeader).substring('Bearer'.length + 1);

  if (token !== null || token !== undefined) {
    const base64String = token.split(`.`)[1];
    const decodedValue = JSON.parse(Buffer.from(base64String, `base64`).toString(`ascii`));
    return decodedValue;
  }
  return null;
}

export const extractTokenFromAuthHeader = (authorizationHeader: string): string => {
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
export const getAuthProvider = (tokenJson: any): string => {

  if (tokenJson.authProvider) return tokenJson.authProvider;

  if (tokenJson.iss && (tokenJson.iss.indexOf("accounts.google.com") > -1)) return AUTH_PROVIDERS.google;

  return "custom";

}