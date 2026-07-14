# Agent 开发规范

本文件是编码 Agent 的唯一入口。目标是让 Agent 用最少上下文完成可靠修改：先分类任务，再读取必要文档和实现事实，最后按影响范围验证并同步文档。

## 执行流程

每次任务按以下顺序执行：

1. 检查工作区状态，保留用户已有未提交改动。
2. 按“任务路由”读取相关主题文档，不默认全量读取。
3. 定位该主题的代码事实源，确认文档与实现是否一致。
4. 列出影响面：业务、API、数据库、前端、安全、测试、部署和文档。
5. 在既有分层内做最小完整修改，不顺带重构无关代码。
6. 按“验证矩阵”运行命令，并检查代码、类型、测试和文档的一致性。

如果文档与实现冲突，不得静默选择一方。先根据用户目标判断是修正文档、修正实现，还是两者同时调整，并在交付说明中指出冲突和处理结果。

## 任务路由

| 变更类型 | 必读文档 | 主要代码事实源 |
| --- | --- | --- |
| 项目结构、模块职责、跨层调用 | `docs/ARCHITECTURE.md` | 实际目录和 import 关系 |
| Worker 业务规则、激活、校验、换机、删除 | `docs/BUSINESS_RULES.md` | `worker/src/service.ts`、相关测试 |
| API 路径、参数、响应、分页、错误码 | `docs/API.md` | `worker/src/routes.ts`、`worker/src/http.ts`、`worker/src/constants.ts` |
| 数据库字段、索引、迁移、查询结果 | `docs/DATABASE.md` | `migrations/`、`worker/src/repository.ts`、`worker/src/types.ts` |
| 鉴权、密钥、HMAC、JWT、日志、敏感数据 | `docs/SECURITY.md` | `worker/src/config.ts`、`crypto.ts`、`middleware.ts` |
| 前端页面、交互、样式、后台结构 | `docs/FRONTEND.md` | `admin/src/routes.tsx`、`components/`、`pages/`、`api.ts` |
| 本地命令、测试、开发环境 | `docs/DEVELOPMENT.md` | 根目录及子项目 `package.json` |
| 构建、部署、D1 远程迁移、Worker assets | `docs/DEPLOYMENT.md` | Wrangler 配置和部署脚本 |
| 文档结构、开源入口或规则归档 | `docs/README.md` | 根目录文档 |

任务跨多个类型时，只组合读取相关文档。例如新增 API 字段通常需要阅读 `API.md`；若字段持久化，再加读 `DATABASE.md`；若在后台展示，再加读 `FRONTEND.md`。

## 事实源规则

- 产品范围、状态语义和业务不变量以 `docs/BUSINESS_RULES.md` 为规范来源。
- HTTP 路由和参数读取以 `worker/src/routes.ts` 为实现来源，必须与 `docs/API.md` 保持一致。
- 数据库现状以按顺序应用后的 `migrations/` 为实现来源，不以 TypeScript 类型推测 schema。
- 运行时枚举和错误码以 `worker/src/constants.ts` 为实现来源；前端同类常量必须同步。
- 本地和部署命令以各级 `package.json` 的 `scripts` 为实现来源。
- 管理后台页面和菜单以 `admin/src/routes.tsx` 为实现来源。
- 安全不可破坏约束高于普通实现便利；发现冲突时停止扩大改动并优先消除风险。

## 代码边界

- `worker/src/routes.ts`：HTTP 路由、参数读取、基础校验和响应组织。
- `worker/src/service.ts`：业务规则、状态流转、跨 repository 操作。
- `worker/src/repository.ts`：D1 SQL 访问，不承载业务判断。
- `worker/src/constants.ts`：Worker 状态、动作、错误码等运行时常量和派生类型。
- `worker/src/crypto.ts`：哈希、HMAC、JWT、随机码等加密逻辑。
- `worker/src/http.ts`：JSON 读取、参数校验、成功/失败响应结构。
- `worker/src/middleware.ts`：管理员 Bearer Token 鉴权。
- `worker/src/time.ts`：过期判断和授权时长计算。
- `admin/src/App.tsx`：顶层 Provider、登录态和当前管理员加载。
- `admin/src/routes.tsx`：页面注册、路径与菜单结构。
- `admin/src/components/`：后台外壳、登录页和跨页面组件。
- `admin/src/pages/`：业务页面，每个页面一个文件。
- `admin/src/hooks/`：跨页面复用的数据加载逻辑。
- `admin/src/shared/`：展示工具、参数处理、文档/SDK 数据和通用类型。
- `admin/src/api.ts`：API 请求封装、token 读写、查询参数处理。
- `admin/src/types.ts`：管理后台接口类型。

后端依赖方向保持为 `route -> service -> repository`。路由不得直接实现业务状态流转，repository 不得根据业务语义做决策。

## 变更影响检查

| 发生变化 | 必查同步项 |
| --- | --- |
| API 请求或响应字段 | Worker 类型、路由/服务、`admin/src/types.ts`、调用方、`docs/API.md` |
| 状态、动作、错误码枚举 | Worker 常量与类型、服务/repository、前端常量与展示、测试、API/业务文档 |
| 数据库字段或索引 | 新迁移、repository SQL、Worker 类型、测试、`docs/DATABASE.md` |
| 业务状态流转 | service、repository 原子更新条件、日志、测试、`docs/BUSINESS_RULES.md` |
| 新增后台页面 | `admin/src/pages/`、`admin/src/routes.tsx`、i18n 文案、必要的 API 类型、`docs/FRONTEND.md` |
| 密钥或鉴权行为 | 配置校验、crypto/middleware、日志脱敏、示例环境、`docs/SECURITY.md` 和部署文档 |
| 命令或生产配置 | `package.json`/Wrangler 配置、`docs/DEVELOPMENT.md`、`docs/DEPLOYMENT.md` |

## 修改原则

- 保持改动集中，不做无关重构。
- 不覆盖用户已有未提交改动；相关变更先读懂再继续。
- 优先复用已有常量、类型、响应结构和组件模式。
- SQL 只放 `repository.ts`，使用 prepared statement 和 `.bind(...)`。
- 前端接口调用只走 `admin/src/api.ts`。
- 可见文案走 `admin/src/i18n/`，不要在新页面散落不可翻译文本。
- 数据库 schema 变化必须新增 `migrations/` 文件，不修改已发布迁移表达线上变更。
- 行为变更必须增加或更新能证明规则的测试；不要只测试实现细节。
- 不在多个文档复制同一规范；详细规则归对应主题文档，其他文件只链接或摘要。

## 不可破坏约束

- 不保存或记录完整明文激活码。
- 不保存或记录应用密钥、设备指纹明文。
- 激活码过期时间从首次激活时间计算。
- 已解绑激活码重新绑定时不得重算授权起止时间。
- 激活码删除使用软删除。
- `/api/admin/*` 除登录外必须保持 Bearer Token 鉴权。
- 客户端接口必须校验 `app_id` 和 `app_secret`。
- SQL 不得拼接用户输入。
- API 不得返回裸异常、SQL 错误或密钥相关信息。
- 不提交真实密钥、`.dev.vars`、`wrangler.production.toml`、Wrangler 本地状态或构建产物。

## 验证矩阵

前端逻辑或类型变更：

```bash
pnpm --filter @license-manager/admin type-check
```

前端构建、路由或静态资源相关变更再运行：

```bash
pnpm --filter @license-manager/admin build
```

Worker 业务、API 或数据库访问变更：

```bash
pnpm --filter @license-manager/worker type-check
pnpm --filter @license-manager/worker test
```

跨项目、构建或部署相关变更：

```bash
pnpm type-check
pnpm build
```

数据库迁移变更额外运行：

```bash
pnpm db:migrate:local
```

纯文档变更可以不运行代码测试，但必须检查路径、命令、枚举和字段名，并在交付说明中写明未运行测试的原因。

## 完成定义

- 用户要求的行为和边界已实现，没有遗留半成品路径。
- 代码分层、类型、API、数据库和前端调用没有互相矛盾。
- 关键成功路径、拒绝路径和边界条件有对应测试或明确验证。
- 敏感数据没有进入日志、URL、提交文件或长期存储。
- 相关主题文档已经同步，且没有复制出第二套冲突规则。
- 最终说明包含改动范围、验证结果和任何剩余风险。
