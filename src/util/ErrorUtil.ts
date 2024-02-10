import { Logger } from "toto-api-controller/dist/logger/TotoLogger";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";

export function basicallyHandleError(error: any, logger: Logger, cid?: string) {

    logger.compute(cid, `${error}`, "error")

    if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
        throw error;
    }

    console.log(error);
    
    throw error;

}
