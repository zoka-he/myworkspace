/**
 * Catch-all：将未在 app/api 下单独实现的路由，转发到 pages/api 的 handler（通过 adapter 复用）。
 * 已单独实现的路由（如 app/api/web/my-account/initdata/route.ts）会优先匹配，不会走此处。
 */
import { NextRequest, NextResponse } from 'next/server';
import { withPagesHandler } from '@/src/lib/pagesApiAdapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

async function handleRequest(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
): Promise<Response> {
  const { path } = await context.params;
  const pathSegments = path ?? [];

  if (pathSegments.length === 0) {
    return NextResponse.json(
      { error: 'API route not found', path: request.url },
      { status: 404 }
    );
  }

  const pathKey = pathSegments.join('/');

  try {
    const { loadPagesApiHandler } = await import('@/src/lib/pagesApiHandlerMap.generated');
    const mod = await loadPagesApiHandler(pathKey);
    if (!mod?.default || typeof mod.default !== 'function') {
      return NextResponse.json(
        { error: 'API route not found', path: request.url },
        { status: 404 }
      );
    }
    return withPagesHandler(mod.default, request, pathSegments);
  } catch (err) {
    console.error('[app/api/[[...path]]]', pathKey, err);
    return NextResponse.json(
      { error: 'API route not found', path: request.url },
      { status: 404 }
    );
  }
}
