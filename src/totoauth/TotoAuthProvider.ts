import { AuthCheckResult, CustomAuthVerifier, IdToken } from "toto-api-controller/dist/model/CustomAuthVerifier";
const { verifyToken } = require('./api/AuthAPI');

export class TotoAuthProvider implements CustomAuthVerifier {

    authAPIEndpoint: string;

    constructor(authAPIEndpoint: string) {
        this.authAPIEndpoint = authAPIEndpoint;
    }

    getAuthProvider(): string {
        return "toto"
    }

    async verifyIdToken(idToken: IdToken): Promise<AuthCheckResult> {

        console.log("Validating custom token");

        const result = await verifyToken(this.authAPIEndpoint, idToken.idToken, null)

        if (!result || result.code == 400) throw result;
        if (result && result.name == 'JsonWebTokenError') throw {code: 400, message: result.message}
        if (result && result.name == "TokenExpiredError") throw {code: 401, message: `JWT Token expired at ${result.expiredAt}`}

        console.log("Custom token successfully validated");

        return {
            sub: result.sub,
            email: result.email,
            authProvider: result.authProvider
        }

    }
}
