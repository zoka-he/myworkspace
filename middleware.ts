import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextRequestWithAuth, withAuth } from 'next-auth/middleware';
import AUTH_SECRET from '@/src/utils/auth/secret.json';
import appInterceptor from './interceptors/appInterceptor';

const pcInterceptor = withAuth(
    {
        callbacks: {
            authorized: ({ token, req }) => {
                // console.debug('[middleware.ts] req', req.nextUrl.pathname);

                // 如果包含token，则放行
                if (!!token?.user) {
                    return true;
                }

                return false;
            },
        },
        secret: AUTH_SECRET,
    }
)

export default function middleware(request: NextRequestWithAuth, event: NextFetchEvent) {

    // 静态资源放行
    if (/^(\/mapicons|\/scripts|\/_next)/.test(request.nextUrl.pathname)) {
        return NextResponse.next();
    }

    // pc登录相关页面直接放行
    if (/^(\/api\/auth|\/login)/.test(request.nextUrl.pathname)) {
        return NextResponse.next();
    }

    console.debug('access -->>', request.nextUrl.pathname);

    // app相关页面，使用app拦截器
    if (/^(\/app)/.test(request.nextUrl.pathname)) {
        return appInterceptor(request);
    }
    
    // 由于前期架构原因，在前序进行减法处理后，默认进入pc拦截器，进行pc端统一鉴权
    return pcInterceptor(request, event);
}

export const config = {
    matcher: ['/:path*'],
}