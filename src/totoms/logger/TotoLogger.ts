
import moment from 'moment-timezone'
import { TotoRuntimeError } from '../model/TotoRuntimeError';

export class Logger {

  private static instance: Logger;

  private constructor(private apiName: string) { }

  /**
   * Initializes the singleton instance of the Logger
   */
  static init(apiName: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(apiName);
    }
    return Logger.instance;
  }

  /**
   * Gets the singleton instance of the Logger
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      throw new TotoRuntimeError(500, "Logger instance not initialized. Call Logger.init(apiName) first.");
    }
    return Logger.instance;
  }

  /**
   * This method logs an incoming call to an API path
   */
  apiIn(correlationId: string | string[] | undefined, method: string, path: string, msgId?: string) {

    let ts = moment().tz('Europe/Rome').format('YYYY-MM-DD HH:mm:ss.SSS');

    console.info(`[${ts}] - [${correlationId}] - [${this.apiName}] - [api-in] - [info] - Recevied HTTP call [${method}] ${path}`)

  }

  /**
   * This method logs an outgoing call to an API
   */
  apiOut(correlationId: string | string[] | undefined, api: string, method: string, path: string, msgId?: string) {

    let ts = moment().tz('Europe/Rome').format('YYYY-MM-DD HH:mm:ss.SSS');

    console.info(`[${ts}] - [${correlationId}] - [${this.apiName}] - [api-out] - [info] - Executing HTTP call to api [${api}] [${method}] ${path}`)

  }

  /**
  * This method logs an incoming message received from a topic
  */
  eventIn(correlationId: string | string[] | undefined, topic: string, msgId?: string) {

    let ts = moment().tz('Europe/Rome').format('YYYY-MM-DD HH:mm:ss.SSS');

    console.info(`[${ts}] - [${correlationId}] - [${this.apiName}] - [event-in] - [info] - Recevied event from topic [${topic}]`)

  }

  /**
  * This method logs an outgoing message sent to a topic
  */
  eventOut(correlationId: string | string[] | undefined, topic: string, msgId?: string) {

    let ts = moment().tz('Europe/Rome').format('YYYY-MM-DD HH:mm:ss.SSS');

    console.info(`[${ts}] - [${correlationId}] - [${this.apiName}] - [event-out] - [info] - Publishing event to topic [${topic}]`)

  }

  /**
   * This method logs a generic message
   * Log level can be 'info', 'debug', 'error', 'warn'
   */
  compute(correlationId: string | string[] | undefined, message: string, logLevel?: string) {

    let ts = moment().tz('Europe/Rome').format('YYYY-MM-DD HH:mm:ss.SSS');

    logLevel = logLevel ?? "info"

    if (logLevel == 'info') console.info(`[${ts}] - [${correlationId}] - [${this.apiName}] - [info] - ${message}`)
    else if (logLevel == 'error') console.error(`[${ts}] - [${correlationId}] - [${this.apiName}] - [info] - ${message}`)
    else if (logLevel == 'warn') console.warn(`[${ts}] - [${correlationId}] - [${this.apiName}] - [info] - ${message}`)
    else console.info(`[${ts}] - [${correlationId}] - [${this.apiName}] - [info] - ${message}`)

  }
}

