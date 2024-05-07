import { NextRequest, NextResponse } from "next/server";
import verifyJwt from "./verifyJwt";

export default async function(request: NextRequest) {
    // const response = NextResponse.next();
    let { headers } = request;
    let appToken = headers.get('x-token'); 

    let isAuth = false;
    let message = 'invalid x-token';
    let userId;
    let username;

    if (appToken) {
        let verifyResult = await verifyJwt(appToken);
        if (verifyResult.success) {
            isAuth = true;
            userId = verifyResult.id;
            username = verifyResult.username;
        } else {
            message = verifyResult.message;
        }
    }

    if (!isAuth) {
        // @ts-ignore
        return Response.json(
            { success: false, message },
            { status: 401 }
        )
    } 

    // 附加userId、username
    let headers2 = new Headers(request.headers);
    headers2.set('x-userid', (userId as string));
    headers2.set('x-username', (username as string));

    return NextResponse.next({
        request: {
            headers: headers2
        }
    });
}