
export interface TotoMessage {

    timestamp: string;  // YYYY.MM.DD HH:mm:ss timestamp of the event
    cid: string;        // Correlation ID
    id: string;         // Identifier of the object related to the event (if any)
    type: string;       // Event type (identifier of the event that can be used to route the message)
    msg: string;        // Human-readable message describing the event (not really useful for processing, mostly for logging purposes)
    data: any;          // Event data (payload)
    
}
