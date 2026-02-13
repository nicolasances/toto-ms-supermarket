import { Logger, ValidationError } from "totoms";

export function basicallyHandleError(error: any, logger: Logger, cid?: string) {

    logger.compute(cid, `${error}`, "error")

    if (error instanceof ValidationError) {
        throw error;
    }

    console.log(error);
    
    throw error;

}
