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

async function fetchNacosConfigs(
  serverAddr: string,
  namespace: string,
  username?: string,
  password?: string,
  appNameFilter?: string
) {
  const baseUrl = toNacosBaseUrl(serverAddr);
  let accessToken = '';

  if (username && password) {
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
    accessToken = loginData.accessToken || '';
  }

  const listParams = new URLSearchParams({
    pageNo: '1',
    pageSize: '100',
    namespaceId: namespace || 'public',
    search: 'blur',
  });
  if (appNameFilter) {
    listParams.set('appName', appNameFilter);
  }
  if (accessToken) {
    listParams.set('accessToken', accessToken);
  }

  const listResp = await fetch(`${baseUrl}/nacos/v3/admin/cs/config/list?${listParams.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!listResp.ok) {
    throw new Error(`nacos config list failed: ${listResp.status}`);
  }

  const listData = (await listResp.json()) as {
    code?: number;
    message?: string;
    data?: {
      totalCount?: number;
      pageItems?: Array<{
        id?: string | number;
        dataId?: string;
        groupName?: string;
        appName?: string;
        namespaceId?: string;
        type?: string;
        modifyTime?: number;
      }>;
    };
  };
  if ((listData.code ?? 0) !== 0) {
    throw new Error(`nacos list api error: ${listData.message || listData.code}`);
  }
  const payload = listData.data || {};

  const allItems = (payload.pageItems || []).map((item) => ({
      id: item.id ?? `${item.dataId || ''}_${item.groupName || ''}`,
      dataId: item.dataId || '',
      group: item.groupName || '',
      appName: item.appName || '',
      tenant: item.namespaceId || '',
      type: item.type || '',
      gmtModified: item.modifyTime || 0,
  }));

  const filteredItems = appNameFilter
    ? allItems.filter((item) => (item.appName || '').toLowerCase() === appNameFilter.toLowerCase())
    : allItems;

  return {
    totalCount: Number(payload.totalCount || 0),
    filteredCount: filteredItems.length,
    items: filteredItems,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appFilter = searchParams.get('appFilter') || 'all';
    const appNameFilter = appFilter === 'myworksite' ? 'myworksite' : '';

    const nacosModule = await import('@/src/server/nacos/client');
    const nacosEnabled = process.env.NACOS_ENABLE_CLIENT === 'true';
    const namingEnabled = process.env.NACOS_ENABLE_NAMING === 'true';
    const serverAddr = process.env.NACOS_SERVER_ADDR || process.env.NACOS_SERVER_LIST || '127.0.0.1:8848';
    const namespace = process.env.NACOS_NAMESPACE || 'public';

    // 在 Next.js dev 多运行时上下文下，instrumentation 初始化状态不一定与 API 路由共享内存。
    // 因此这里做一次主动探测：若启用但当前上下文未初始化，则尝试就地初始化。
    let configClient = nacosModule.getNacosConfigClient?.();
    let namingClient = nacosModule.getNacosNamingClient?.();
    if (nacosEnabled && !configClient && typeof nacosModule.initNacosClient === 'function') {
      await nacosModule.initNacosClient();
      configClient = nacosModule.getNacosConfigClient?.();
      namingClient = nacosModule.getNacosNamingClient?.();
    }

    let configs: Array<{
      id: string | number;
      dataId: string;
      group: string;
      appName: string;
      tenant: string;
      type: string;
      gmtModified: number;
    }> = [];
    let configTotal = 0;
    let configListError = '';

    if (nacosEnabled) {
      try {
        const listResult = await fetchNacosConfigs(
          serverAddr,
          namespace,
          process.env.NACOS_USERNAME,
          process.env.NACOS_PASSWORD,
          appNameFilter
        );
        configs = listResult.items;
        configTotal = listResult.filteredCount || listResult.totalCount;
      } catch (e: unknown) {
        configListError = e instanceof Error ? e.message : 'failed to list nacos configs';
      }
    }

    return NextResponse.json({
      nacosEnabled,
      initialized: Boolean(configClient),
      namingEnabled,
      namingInitialized: Boolean(namingClient),
      serverAddr,
      namespace,
      serviceName: process.env.NACOS_SERVICE_NAME || '',
      configTotal,
      configListError,
      configs,
      checkedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed to read nacos status';
    return NextResponse.json(
      {
        nacosEnabled: process.env.NACOS_ENABLE_CLIENT === 'true',
        initialized: false,
        namingEnabled: process.env.NACOS_ENABLE_NAMING === 'true',
        namingInitialized: false,
        error: message,
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
