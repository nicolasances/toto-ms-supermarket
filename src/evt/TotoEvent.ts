
export class TotoEvent {
    timestamp: string
    cid: string
    id: string
    type: string
    msg: string
    data?: any

    constructor(timestamp: string, cid: string, id: string, type: string, msg: string, data?: any) {
        this.timestamp = timestamp;
        this.cid = cid;
        this.id = id;
        this.type = type;
        this.msg = msg;
        this.data = data;
    }

}