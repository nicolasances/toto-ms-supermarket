import moment from 'moment-timezone'

export function correlationId(): string {

    let ts = moment().tz('Europe/Rome').format('YYYYMMDDHHmmssSSS');

    let random = (Math.random() * 100000).toFixed(0).padStart(5, '0');

    return ts + '' + random;
}