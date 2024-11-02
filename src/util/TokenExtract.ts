

export function extractTokenFromHeader(httpHeaders: any): string | null {

    // Authorization
    let authorizationHeader = httpHeaders['authorization'];
    if (!authorizationHeader) authorizationHeader = httpHeaders['Authorization'];

    if (!authorizationHeader || authorizationHeader.indexOf("Bearer") == -1) return null;

    let token = authorizationHeader.substring('Bearer'.length + 1);

    return token;

}