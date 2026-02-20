import { Logger } from "../logger/TotoLogger";
import { TotoRuntimeError } from "../model/TotoRuntimeError";
import { ValidationError } from "../validation/Validator";

export function basicallyHandleError(error: any, logger: Logger, cid?: string) {

    logger.compute(cid, `${error}`, "error")

    if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
        throw error;
    }

    console.log(error);
    
    throw error;

}
