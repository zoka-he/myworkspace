import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toNacosBaseUrl(serverAddr: string) {
  const first = (serverAddr || '').split(',')[0]?.trim() || '127.0.0.1:8848';
  if (first.startsWith('http://') || first.startsWith('https://')) {
    return first.replace(/\/$/, '');
  }
  return `http://${first}`;
}

async function getAccessToken(baseUrl: string, username?: string, password?: string) {
  if (!username || !password) return '';
  const loginParams = new URLSearchParams({ username, password });
  const loginResp = await fetch(`${baseUrl}/nacos/v1/auth/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: loginParams.toString(),
    cache: 'no-store',
  });
  if (!loginResp.ok) {
    throw new Error(`nacos login failed: ${loginResp.status}`);
  }
  const loginData = (await loginResp.json()) as { accessToken?: string };
  return loginData.accessToken || '';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dataId = searchParams.get('dataId') || '';
    const group = searchParams.get('group') || '';
    const tenant = searchParams.get('tenant') || process.env.NACOS_NAMESPACE || 'public';
    if (!dataId || !group) {
      return NextResponse.json({ message: 'dataId and group are required' }, { status: 400 });
    }

    const serverAddr = process.env.NACOS_SERVER_ADDR || process.env.NACOS_SERVER_LIST || '127.0.0.1:8848';
    const baseUrl = toNacosBaseUrl(serverAddr);
    const accessToken = await getAccessToken(baseUrl, process.env.NACOS_USERNAME, process.env.NACOS_PASSWORD);

    const query = new URLSearchParams({
      dataId,
      groupName: group,
      namespaceId: tenant,
    });
    if (accessToken) {
      query.set('accessToken', accessToken);
    }

    const resp = await fetch(`${baseUrl}/nacos/v3/admin/cs/config?${query.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!resp.ok) {
      return NextResponse.json({ message: `nacos config detail failed: ${resp.status}` }, { status: resp.status });
    }

    const payload = (await resp.json()) as {
      code?: number;
      message?: string;
      data?: {
        content?: string;
      };
    };
    if ((payload.code ?? 0) !== 0) {
      return NextResponse.json(
        { message: payload.message || `nacos config detail failed: ${payload.code}` },
        { status: 500 }
      );
    }

    const content = payload.data?.content || '';
    return NextResponse.json({ dataId, group, tenant, content });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed to read nacos config content';
    return NextResponse.json({ message }, { status: 500 });
  }
}
