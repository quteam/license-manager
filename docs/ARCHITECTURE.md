# 架构说明

授权管理系统是一个 Cloudflare Workers 应用，Worker 同时提供 `/api/*` 后端接口和 `admin/dist` 静态资源托管。

## 顶层结构

```text
.
├── admin/        # React + Vite 管理后台
├── docs/         # 项目文档
├── migrations/   # Cloudflare D1 migration
├── worker/       # Cloudflare Workers + Hono API
└── pnpm-workspace.yaml
```

## 请求流

```text
Browser/Admin
  -> Worker
  -> /api/* routed by Hono
  -> route validation
  -> service business rules
  -> repository D1 queries
  -> unified JSON response
```

非 `/api/*` 请求由 Worker assets 回退到管理后台静态资源。

## Worker 分层

- `worker/src/index.ts`：Worker 入口、CORS、静态资源回退、全局错误处理。
- `worker/src/routes.ts`：HTTP 路由、参数读取、基础校验、响应组织。
- `worker/src/service.ts`：业务规则、状态流转、跨 repository 操作。
- `worker/src/repository.ts`：D1 SQL 和数据读取写入。
- `worker/src/constants.ts`：状态、动作、错误码等运行时常量和派生类型。
- `worker/src/crypto.ts`：随机值、HMAC、密码哈希、JWT。
- `worker/src/http.ts`：JSON 读取、参数校验、统一响应结构。
- `worker/src/middleware.ts`：管理员 Bearer Token 鉴权。
- `worker/src/time.ts`：时间计算和过期判断。
- `worker/src/types.ts`：共享类型定义。

分层约束：

- `routes.ts` 不承载业务状态流转。
- `service.ts` 是业务规则的主要落点。
- `repository.ts` 不做业务判断，只封装 SQL。
- 加密、哈希、JWT 逻辑只通过 `crypto.ts` 复用。
- 时间计算优先复用 `time.ts`。

## Admin 分层

- `admin/src/App.tsx`：顶层 Provider、登录态和当前管理员加载。
- `admin/src/components/`：后台外壳、登录页、修改密码弹窗等跨页面组件。
- `admin/src/pages/`：业务页面，每个页面一个文件。
- `admin/src/hooks/`：跨页面复用的数据加载逻辑。
- `admin/src/shared/`：前端展示工具、参数处理和通用类型。
- `admin/src/shared/constants.ts`：状态、动作、平台选项和表格枚举常量。
- `admin/src/api.ts`：API 请求封装、token 读写、查询参数处理。
- `admin/src/types.ts`：后台接口类型。
- `admin/src/styles.css`：全局样式和布局修正。

前端新增功能时优先复用当前的 Ant Design Pro 模式，不引入新的 UI 框架。详细约定见 [前端规范](FRONTEND.md)。

## 错误处理

业务错误使用 `ApiError` 抛出，由 `worker/src/index.ts` 统一转成失败响应。接口不要返回裸异常、SQL 错误或密钥相关信息。

统一响应结构见 [API 规范](API.md)。
