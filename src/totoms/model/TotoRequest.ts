import { Request } from "express";

/**
 * Base class for all Toto requests.
 * 
 * Subclasses should implement a static `fromExpress` method to create instances from Express Request objects:
 * 
 * @example
 * ```typescript
 * class MyRequest extends TotoRequest {
 *     myField: string;
 * }
 * ```
 */
export abstract class TotoRequest {
}