# 架构说明

License Manager 是部署在 Cloudflare Workers 上的单体应用。Worker 同时提供 `/api/*` JSON API 和 `admin/dist` 管理后台静态资源；Cloudflare D1 是唯一持久化存储。

本文只定义系统边界、分层和依赖规则。业务条件见 [业务规则](BUSINESS_RULES.md)，HTTP 契约见 [API 规范](API.md)，数据结构见 [数据库规范](DATABASE.md)。

## 系统边界

```text
Admin browser                         Client application
      |                                      |
      | Bearer JWT                           | app_id + app_secret
      v                                      v
┌────────────────────────────────────────────────────────┐
│ Cloudflare Worker                                      │
│  /api/* -> Hono routes -> service -> repository -> D1 │
│  other paths ---------------------------> static assets │
└────────────────────────────────────────────────────────┘
```

- 管理后台和 API 同源部署，非 `/api/*` 请求回退到 Worker assets。
- 管理端使用管理员 JWT；客户端使用应用 ID 和应用密钥，不共享管理员鉴权。
- 业务数据只写入 D1；激活码认证值、应用密钥和设备指纹保存不可逆 HMAC，激活码另保留非认证用途的后缀。
- 系统当前是单租户、单 D1、单 Worker 部署模型。

## 顶层结构

```text
.
├── admin/        # React + Vite 管理后台
├── docs/         # 当前规范与历史设计记录
├── migrations/   # Cloudflare D1 migrations
├── scripts/      # 环境初始化和生产检查脚本
├── worker/       # Cloudflare Workers + Hono API
└── pnpm-workspace.yaml
```

## Worker 分层

```text
index.ts
  -> routes.ts
       -> service.ts
            -> repository.ts
                 -> D1
```

| 模块 | 职责 | 不应承担 |
| --- | --- | --- |
| `index.ts` | 挂载 `/api`、全局错误转换、API 404、静态资源回退 | 业务规则和 SQL |
| `routes.ts` | 路由、JSON/路径/查询参数读取、基础类型和范围校验、响应组织 | 状态流转和跨表业务 |
| `service.ts` | 业务不变量、状态流转、鉴权后的领域操作、跨 repository 协调、业务日志 | 原始 HTTP 解析和内联 SQL |
| `repository.ts` | prepared SQL、数据库读写、原子条件更新、查询结果映射 | 产品决策和 HTTP 响应 |
| `constants.ts` | 运行时状态、动作、错误码及派生类型 | 可变配置和展示文案 |
| `crypto.ts` | 随机值、HMAC、密码哈希、JWT、常量时间比较 | 业务流程 |
| `http.ts` | JSON 读取、通用参数校验、成功/失败 envelope | 领域校验 |
| `middleware.ts` | 管理员 Bearer Token 校验和 principal 注入 | 管理员业务操作 |
| `time.ts` | ISO 时间、自然月/年计算、过期和剩余时间 | 套餐选择逻辑 |
| `types.ts` | Worker bindings、数据库行、响应和错误类型 | 重复运行时枚举 |

依赖约束：

- 正常业务调用保持 `route -> service -> repository`。
- 纯只读、无业务判断的聚合查询可以由 route 直接调用 repository，例如 dashboard 和列表查询。
- repository 可以使用数据库约束和条件更新保证原子性，但不能自行定义产品规则。
- service 抛出 `ApiError`，由 `index.ts` 统一转换；任何层都不得把裸异常或 SQL 错误作为 API 响应。
- 加密只复用 `crypto.ts`，时间只复用 `time.ts`，不要在路由或 repository 复制算法。

## Admin 分层

```text
App.tsx
  -> Shell.tsx + routes.tsx
       -> pages/*
            -> hooks/* / shared/* / api.ts
```

| 模块 | 职责 |
| --- | --- |
| `admin/src/App.tsx` | Provider、登录态、当前管理员加载、登录/后台入口 |
| `admin/src/routes.tsx` | 页面 key、URL、菜单树、懒加载组件 |
| `admin/src/components/Shell.tsx` | 后台布局、导航、用户菜单、页面容器 |
| `admin/src/components/` | 登录和跨页面交互组件 |
| `admin/src/pages/` | 页面级表格、表单、弹窗和请求协调 |
| `admin/src/hooks/` | 跨页面数据加载逻辑 |
| `admin/src/shared/` | 展示工具、参数、文档/SDK 内容和复用类型 |
| `admin/src/api.ts` | API 请求、Bearer token、查询参数和 401 清理 |
| `admin/src/types.ts` | 管理后台消费的接口类型 |
| `admin/src/i18n/` | 所有可见文案和语言状态 |

前端不得绕过 `api.ts` 直接发请求，也不得自行复制后端状态字符串。详细页面和 UI 约定见 [前端规范](FRONTEND.md)。

## 请求生命周期

管理端写请求：

```text
request
  -> env validation
  -> Bearer middleware
  -> route input validation
  -> service business validation
  -> repository conditional write
  -> audit log when the action is auditable
  -> { ok: true, data }
```

客户端授权请求：

```text
request
  -> env validation
  -> validate app_id and app status
  -> HMAC and compare app_secret
  -> HMAC code and device fingerprint
  -> evaluate code business state
  -> conditional state update when needed
  -> success/failure audit log after code lookup
  -> stable JSON response
```

认证失败或在找到激活码之前失败时，不应为了日志而泄露或持久化请求中的敏感明文。

## 一致性与并发

- D1 没有被假设为长事务业务引擎。关键竞争通过带前置条件的更新处理，例如“仅未激活时激活”“仅未绑定时绑定”。
- 条件更新失败表示状态已被其他请求改变，service 返回稳定的 `CONFLICT`，不得覆盖新状态。
- 同设备重复激活是幂等成功；重复删除、重复状态更新是否成功以对应 repository 条件和 API 契约为准。
- 批量操作允许部分命中，返回请求数量与实际更新数量；单个 ID 的日志只在实际更新后写入。
- 一次性明文响应和数据库写入之间必须保持明确顺序，避免在持久化失败时对外宣称成功。

## 跨层变更规则

| 变更 | 至少涉及 |
| --- | --- |
| 新业务动作 | 常量、service、repository、日志、测试、业务文档；暴露 HTTP 时再改 routes/API |
| 新响应字段 | Worker 返回类型、前端类型和调用方、API 文档 |
| 新持久化字段 | migration、Worker row 类型、repository 查询/写入、测试、数据库文档 |
| 新后台页面 | page、routes、菜单/i18n、必要的 API/type、前端文档 |
| 新错误码 | Worker 常量、抛出点、前端处理或展示、测试、API 文档 |
| 新密钥或鉴权方式 | bindings/config、crypto/middleware、示例环境、部署、安全和 API 文档 |

任何跨层变化都应从领域规则向外扩展，不能只修补最终页面或单个 SQL 查询。
