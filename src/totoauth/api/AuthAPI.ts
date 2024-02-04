import http from 'request'

export function verifyToken (endpoint: string, token: string, cid?: string): Promise<any> {

    return new Promise((success, failure) => {

        http({
            uri: endpoint + '/verify',
            method: 'POST',
            headers: {
                'x-correlation-id': cid, 
                'Authorization': `Bearer ${token}`
            }
        }, (err: any, resp: any, body: any) => {

            if (err) {
                console.log(err)
                failure(err);
            }
            else success(JSON.parse(body));

        })

    })
}