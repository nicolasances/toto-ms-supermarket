
export class TotoRuntimeError extends Error {

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