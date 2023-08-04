import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/utils/session";
import { NextApiRequest } from "next";

export default async function(request: NextRequest): Promise<[boolean, NextResponse | null]> {
    const response = NextResponse.next();
    // @ts-ignore
    let session = await getSession(request, response);
    console.debug('[userInterceptor] session', session);

    return [true, null];
}