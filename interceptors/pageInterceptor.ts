import { NextRequest, NextResponse } from "next/server";

export default function(request: NextRequest) {
    const response = NextResponse.next();
    return response;
}