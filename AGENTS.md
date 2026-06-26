# Agent 开发规范

本文件是编码 Agent 的入口规范。目标是减少无效阅读和重复判断：先用任务路由定位需要读的文档，再按对应边界修改代码。

## 任务路由

按变更类型阅读必要主题文档：

- 前端页面、交互、样式、管理后台结构：`docs/FRONTEND.md`
- Worker 业务规则、激活、校验、换机、删除：`docs/BUSINESS_RULES.md`
- API 路径、参数、响应、分页、错误码：`docs/API.md`
- 数据库字段、索引、迁移、查询结果：`docs/DATABASE.md`
- 鉴权、密钥、HMAC、JWT、日志、敏感数据：`docs/SECURITY.md`
- 本地命令、验证流程、开发环境：`docs/DEVELOPMENT.md`
- 构建、部署、D1 远程迁移、Worker assets：`docs/DEPLOYMENT.md`
- 文档结构、开源入口或规则归档：`docs/README.md`

如果任务跨多个类型，只读相关主题文档，不默认全量阅读。

## 代码边界

- `worker/src/routes.ts`：HTTP 路由、参数读取、基础校验和响应组织。
- `worker/src/service.ts`：业务规则、状态流转、跨 repository 操作。
- `worker/src/repository.ts`：D1 SQL 访问，不承载业务判断。
- `worker/src/constants.ts`：Worker 状态、动作、错误码等运行时常量和派生类型。
- `worker/src/crypto.ts`：哈希、HMAC、JWT、随机码等加密逻辑。
- `worker/src/http.ts`：JSON 读取、参数校验、成功/失败响应结构。
- `worker/src/middleware.ts`：管理员 Bearer Token 鉴权。
- `admin/src/App.tsx`：顶层 Provider、登录态和当前管理员加载。
- `admin/src/components/`：后台外壳、登录页、修改密码弹窗等跨页面组件。
- `admin/src/pages/`：业务页面，每个页面一个文件。
- `admin/src/hooks/`：跨页面复用的数据加载逻辑。
- `admin/src/shared/`：前端展示工具、参数处理和通用类型。
- `admin/src/shared/constants.ts`：管理后台状态、动作、平台选项和表格枚举。
- `admin/src/api.ts`：API 请求封装、token 读写、查询参数处理。
- `admin/src/types.ts`：管理后台接口类型。

## 修改原则

- 保持改动集中，不做无关重构。
- 不覆盖用户已有未提交改动；相关变更先读懂再继续。
- 后端业务判断放 `service.ts`，不要下沉到路由或 repository。
- SQL 只放 `repository.ts`，使用 prepared statement 和 `.bind(...)`。
- 前端接口调用只走 `admin/src/api.ts`。
- 前端新增页面必须放入 `admin/src/pages/`，并在 `components/Shell.tsx` 接入菜单和渲染。
- 接口返回字段变化时，同时更新后端类型、前端类型、调用方和文档。
- 数据库 schema 变化必须新增 `migrations/` 文件，不改已发布迁移表达线上变更。

## 不可破坏约束

- 不保存完整明文激活码。
- 不保存应用密钥或设备指纹明文。
- 激活码过期时间从首次激活时间计算。
- 激活码删除使用软删除。
- `/api/admin/*` 除登录外必须保持 Bearer Token 鉴权。
- 客户端接口必须校验 `app_id` 和 `app_secret`。
- SQL 不得拼接用户输入。
- API 不得返回裸异常、SQL 错误或密钥相关信息。
- 不提交真实密钥、`.dev.vars`、`wrangler.production.toml`、Wrangler 本地状态或构建产物。

## 文档同步

- 业务规则变更：更新 `BUSINESS_RULES.md`。
- API 变更：更新 `API.md`。
- 数据库变更：更新 `DATABASE.md`。
- 前端结构、页面模式或 UI 约定变更：更新 `FRONTEND.md`。
- 安全规则或敏感数据处理变更：更新 `SECURITY.md`。
- 命令、验证流程或开发环境变更：更新 `DEVELOPMENT.md`。
- 部署流程或生产要求变更：更新 `DEPLOYMENT.md`。
- 文档职责或阅读入口变更：更新 `README.md`、必要时更新 `README.zh-CN.md`，并同步更新本文件。
- 开源协作入口变更：同步更新 `README.md`、`README.zh-CN.md`、`CONTRIBUTING.md`、根目录 `SECURITY.md` 或 `LICENSE`。

## 验证命令

前端变更：

```bash
pnpm --filter @license-manager/admin type-check
```

Worker 业务或数据库访问变更：

```bash
pnpm --filter @license-manager/worker type-check
pnpm --filter @license-manager/worker test
```

跨项目、构建或部署相关变更：

```bash
pnpm type-check
pnpm build
```

数据库迁移变更：

```bash
pnpm db:migrate:local
```

纯文档变更可以不跑测试，但最终说明需要写明原因。

## 完成前检查

- 代码、类型和文档没有互相矛盾。
- 前端页面、API 类型和后端响应保持一致。
- 数据库迁移、查询和类型保持一致。
- 敏感数据没有进入日志、URL、提交文件或长期存储。
- 已按影响范围验证，或说明未验证原因。
