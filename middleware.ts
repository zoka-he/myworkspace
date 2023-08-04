import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import apiInterceptor from './interceptors/apiInterceptor';
import pageInterceptor from './interceptors/pageInterceptor';
import userInterceptor from './interceptors/userInterceptor';
import { withAuth } from 'next-auth/middleware';
import AUTH_SECRET from '@/src/utils/auth/secret.json';

function middleware(request: NextRequest) {
    let { pathname } = request.nextUrl;
    console.debug('[/middleware.ts]', pathname);

    return NextResponse.next();
}

export default withAuth(
    // `withAuth` augments your `Request` with the user's token.
    middleware,
    {
        callbacks: {
            authorized: ({ token }) => {
                console.debug('[/middleware.ts] token', token);

                return true;
            },
        },
        secret: AUTH_SECRET,
    }
)

export const config = {
    matcher: ['/'],
}