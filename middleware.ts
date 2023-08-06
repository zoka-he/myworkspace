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
            authorized: ({ token, req }) => {
                // console.debug('[middleware.ts] req', req.nextUrl.pathname);

                // 登录相关页面直接放行
                if (/^(\/api\/auth|\/login)/.test(req.nextUrl.pathname)) {
                    return true;
                }
                
                if (!!token?.user) {
                    return true;
                }

                return false;
            },
        },
        secret: AUTH_SECRET,
    }
)

export const config = {
    matcher: ['/:path*'],
}