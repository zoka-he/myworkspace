import { NextRequest, NextResponse } from "next/server";
import verifyJwt from "./verifyJwt";

export default async function(request: NextRequest) {
    // const response = NextResponse.next();
    let { headers } = request;
    let appToken = headers.get('x-token'); 

    let isAuth = false;
    let message = 'invalid x-token';

    if (appToken) {
        let verifyResult = await verifyJwt(appToken);
        if (verifyResult.success) {
            isAuth = true;
        } else {
            message = verifyResult.message;
        }
    }

    if (!isAuth) {
        return Response.json(
            { success: false, message },
            { status: 401 }
        )
    } 

    return NextResponse.next();
}