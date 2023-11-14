import { NextRequest, NextResponse } from "next/server";

export default function(request: NextRequest) {
    // const response = NextResponse.next();
    return Response.json(
        { success: false, message: 'not supported yet!' },
        { status: 401 }
    )
}