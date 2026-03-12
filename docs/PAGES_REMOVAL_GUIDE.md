# pages 目录可移除项说明

## 一、可立即移除（无依赖）

| 路径 | 说明 |
|------|------|
| `pages/index.tsx.old` | 备份文件，当前入口已由 `app/page.tsx` + `app/spa-page.tsx` 承接，可删除。 |

---

## 二、前端页面（已迁移或可移除）

| 路径 | 状态 |
|------|------|
| ~~`pages/_app.tsx`~~ | **已移除**：已由 `app/layout.tsx` + `app/providers.tsx` 替代；且 `pages/` 下已无其他页面，不再被使用。 |
| ~~`pages/_document.tsx`~~ | **已移除**：同上，无 pages 页面后不再被使用。 |
| ~~`pages/500.tsx`~~ | **已迁移**：逻辑在 `app/error.tsx`。 |
| `pages/login/index.tsx` | 若存在：登录迁到 SPA 或 `app/login/page.tsx` 后可删。当前 `pages/` 下仅剩 `pages/api/`，无其他页面。 |

---

## 三、API 路由（已通过 app/api 统一承接）

**当前做法**：所有 `/api/*` 请求由 **App Router** 承接：

- **`app/api/[[...path]]/route.ts`**：catch-all，通过 `src/lib/pagesApiAdapter.ts` 将 Request 转为 Pages 的 req/res，并调用 **`pages/api` 下对应路径的 handler**（由 `src/lib/pagesApiHandlerMap.generated.ts` 静态映射）。
- **`app/api/web/my-account/initdata/route.ts`**：已单独迁为原生 Route Handler，优先于 catch-all 匹配。

因此：

- **路由层面**：已全部走 `app/api`，可视为「pages/api 已迁移到 app/api」。
- **实现层面**：handler 代码仍在 **`pages/api/`** 目录，**不能删除**；删除后 catch-all 的 import 会失败。
- 新增或删除 API 时，需执行 **`npm run generate:api-map`**（或 `npm run prebuild`）以更新 `pagesApiHandlerMap.generated.ts`。

---

## 四、总结

- **已移除：** `pages/index.tsx.old`、`_app.tsx`、`_document.tsx`、`500.tsx`（对应 `app/error.tsx`）。
- **API：** 请求已全部由 `app/api` 处理（catch-all + adapter 复用 `pages/api` 的 handler）；**`pages/api/` 目录及其 .ts/.tsx 需保留**，仅当某接口改为原生 `app/api/xxx/route.ts` 后可删对应 `pages/api/xxx` 文件。
- **脚本：** 增删 API 后运行 `npm run generate:api-map`。
