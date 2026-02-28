# App Router 迁移说明

## 已完成的迁移

### 1. 前端入口（Pages → App）

- **`app/layout.tsx`**：根布局，负责全局样式、metadata、`SessionProvider` 与客户端初始化（dayjs、钱包检测）。
- **`app/providers.tsx`**：客户端 Provider 封装（`'use client'`），包含 `SessionProvider` 与 useEffect 初始化。
- **`app/spa-page.tsx`**：共享的 SPA 根组件（client），包含 Redux / Antd / Wagmi / RabbitMQ / React Router 等逻辑。
- **`app/page.tsx`**：根路径 `/`，直接渲染 `spa-page`。
- **`app/[...slug]/page.tsx`**：必选 catch-all，匹配 `/xxx`、`/xxx/yyy` 等，同样渲染 `spa-page`，避免与根路由 `/` 冲突（Next.js 不允许可选 catch-all `[[...slug]]` 与根路径同存）。

访问任意路径（`/`、`/taskManage/dashboard` 等）均由上述页面渲染同一 SPA，行为与迁移前一致。

### 2. API 路由（示例）

- **`app/api/web/my-account/initdata/route.ts`**：原 `pages/api/web/my-account/initdata.ts` 的 Route Handler 实现，仅保留 GET，使用 `NextResponse.json()`。
- 已删除 **`pages/api/web/my-account/initdata.ts`**，避免同一路径被 App Router 与 Pages Router 同时匹配（Next.js 不允许）。

其余 API 仍在 **`pages/api/`** 下，与 App Router 并存，可逐步迁移。

### 3. next.config.js

- 已移除将 `/:path*` 重写到 `/` 的 rewrite，改由 `app/[[...slug]]/page.tsx` 直接承接前端路由。

## 后续可做的迁移

### 迁移更多 API 到 App Router

Pages 写法：

```ts
// pages/api/web/xxx/yyy.ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ data: '...' });
  }
}
```

对应 App Router 写法：

```ts
// app/api/web/xxx/yyy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: '...' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // ...
  return NextResponse.json({ ... });
}
```

- 路径规则：`pages/api/web/xxx/yyy.ts` → `app/api/web/xxx/yyy/route.ts`。
- 同一路径下若存在 `app/api/.../route.ts`，会优先于 `pages/api/...` 生效。

### 何时删除 pages 目录

- 当所有页面与 API 均已在 `app/`` 中实现并验证通过后，可删除 `pages/`（或仅保留 `pages/api` 做兼容，再逐步迁完）。
- 删除前请确认：登录、initdata、各业务 API 与前端路由均已在 App Router 下测试通过。

## 本地验证

```bash
npm run build
npm run start
```

访问 `/` 与各业务路径，确认 SPA 与 `/api/my-account/initdata`（经 rewrite 到 `/api/web/my-account/initdata`）正常。
