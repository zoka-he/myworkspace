# App Router 迁移说明

## 已完成的迁移

### 1. 前端入口（Pages → App）

- **`app/layout.tsx`**：根布局，负责全局样式、metadata、`SessionProvider` 与客户端初始化（dayjs、钱包检测）。
- **`app/providers.tsx`**：客户端 Provider 封装（`'use client'`），包含 `SessionProvider` 与 useEffect 初始化。
- **`app/spa-page.tsx`**：共享的 SPA 根组件（client），包含 Redux / Antd / Wagmi / RabbitMQ / React Router 等逻辑。
- **`app/page.tsx`**：根路径 `/`，直接渲染 `spa-page`。
- **`app/[...slug]/page.tsx`**：必选 catch-all，匹配 `/xxx`、`/xxx/yyy` 等，同样渲染 `spa-page`，避免与根路由 `/` 冲突（Next.js 不允许可选 catch-all `[[...slug]]` 与根路径同存）。

访问任意路径（`/`、`/taskManage/dashboard` 等）均由上述页面渲染同一 SPA，行为与迁移前一致。

### 2. API 路由（已统一由 app/api 承接）

- **`app/api/[[...path]]/route.ts`**：catch-all，将请求通过 **`src/lib/pagesApiAdapter.ts`** 转为 Pages 的 `req`/`res`，并调用 **`pages/api`** 下对应路径的 handler（路径由 **`src/lib/pagesApiHandlerMap.generated.ts`** 静态映射，由 `npm run generate:api-map` 生成）。因此**路由上**已全部走 app/api，无需逐一手写 Route Handler。
- **`app/api/web/my-account/initdata/route.ts`**：已单独迁为原生 Route Handler，优先于 catch-all 匹配。
- **`pages/api/`**：handler 实现仍保留在此目录，**不能删除**；新增/删除 API 后需执行 `npm run generate:api-map`（或依赖 `prebuild`）更新映射。

### 3. next.config.js

- 已移除将 `/:path*` 重写到 `/` 的 rewrite，改由 `app/[[...slug]]/page.tsx` 直接承接前端路由。

## 后续可做的迁移

### 将单个 API 改为原生 Route Handler（可选）

若希望某接口不再经 adapter、改为纯 App Router 写法，可新增 `app/api/.../route.ts`，写法示例：

```ts
// app/api/web/xxx/yyy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: '...' });
}
```

该路径会优先于 catch-all 匹配；之后可删除对应的 `pages/api/...` 文件，并重新运行 `npm run generate:api-map`。

### 何时可删除 pages/api

- 仅当所有 handler 均已改为 `app/api/.../route.ts` 原生实现，且不再被 `pagesApiHandlerMap.generated.ts` 引用时，方可删除整个 `pages/api` 目录。

## 本地验证

```bash
npm run build
npm run start
```

访问 `/` 与各业务路径，确认 SPA 与 `/api/my-account/initdata`（经 rewrite 到 `/api/web/my-account/initdata`）正常。
