/**
 * 将 App Router 的 Request 转为 Pages API 的 req/res，调用原有 handler 后返回 Response。
 * 用于在 app/api 下复用 pages/api 的 handler，实现「直接迁移」。
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import { ensureRuntimeReady } from '@/src/server/runtime/ready';

type PagesHandler = (req: NextApiRequest, res: NextApiResponse) => void | Promise<void>;

function buildQueryFromUrl(url: string): Record<string, string | string[]> {
  const searchParams = new URL(url).searchParams;
  const query: Record<string, string | string[]> = {};
  searchParams.forEach((value, key) => {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  });
  return query;
}

function buildReq(request: NextRequest, pathSegments: string[]): NextApiRequest {
  const url = request.url;
  const query = buildQueryFromUrl(url);
  return {
    method: request.method,
    query,
    body: undefined,
    headers: Object.fromEntries(request.headers.entries()),
    url,
    cookies: {},
    res: undefined as any,
    status: undefined as any,
  } as NextApiRequest;
}

function buildRes(): {
  res: NextApiResponse;
  promise: Promise<{ status: number; body: unknown }>;
} {
  let statusCode = 200;
  let body: unknown = null;
  let done = false;
  let resolve!: (v: { status: number; body: unknown }) => void;

  const promise = new Promise<{ status: number; body: unknown }>((r) => {
    resolve = r;
  });

  const finish = () => {
    if (!done) {
      done = true;
      resolve({ status: statusCode, body });
    }
  };

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: unknown) {
      body = data;
      finish();
      return res;
    },
    end() {
      finish();
      return res;
    },
    setHeader: () => res,
    getHeader: () => undefined,
    send(data: unknown) {
      body = data;
      finish();
      return res;
    },
  } as NextApiResponse;

  return { res, promise };
}

export async function withPagesHandler(
  handler: PagesHandler,
  request: NextRequest,
  pathSegments: string[]
): Promise<Response> {
  try {
    await ensureRuntimeReady(5000);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'runtime is not ready';
    return NextResponse.json(
      { success: false, message: `Service warming up: ${message}` },
      { status: 503 }
    );
  }

  const req = buildReq(request, pathSegments);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      (req as any).body = await request.json();
    } catch {
      (req as any).body = undefined;
    }
  }

  const { res, promise } = buildRes();

  const run = () => {
    const result = handler(req, res);
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).catch((err) => {
        res.status(500).json({ message: err?.message ?? 'Internal Server Error' });
      });
    }
  };

  run();

  const result = await Promise.race([
    promise,
    new Promise<{ status: number; body: unknown }>((_, reject) =>
      setTimeout(() => reject(new Error('Handler timeout')), 60000)
    ),
  ]);

  return NextResponse.json(result.body, { status: result.status });
}
