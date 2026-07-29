# 授权管理系统

[English](README.md) | 简体中文

轻量、可自托管的多租户软件授权管理系统，面向独立软件、桌面工具、插件、脚本工具和内部系统，覆盖从应用接入、批量发码到设备激活、授权校验、受控换机和审计追踪的完整闭环。

项目基于 Cloudflare Workers + D1 构建后端和数据库，使用 Hono 提供 API，管理后台由 React + Vite + Ant Design Pro 实现。Worker 同时托管后端接口和管理后台静态资源，适合以较低运维成本部署到 Cloudflare 边缘网络。

## 在线演示

- 地址：[https://license.udook.com](https://license.udook.com)
- 租户：`demo`
- 用户名：`test`
- 密码：`test123456`

以上账号仅用于公开演示，请勿在其他场景复用该密码；演示数据可能会定期重置。

## 业务亮点

- **授权周期从真正使用时开始**：周卡、月卡、季卡和年卡均从首次激活计算有效期，提前生成和分发激活码不会损耗客户授权时长。
- **一码一机，同时兼顾换机体验**：默认绑定单一设备，同设备重复激活保持幂等；用户可以在次数和冷却时间约束下自助解绑，管理员也可处理例外换机。
- **多租户统一运营**：一套部署可隔离管理多个客户、团队或业务线；超级管理员管理租户并切换业务上下文，租户管理员只能访问所属租户数据。
- **敏感凭证最小化存储**：完整激活码和应用密钥仅在创建时展示一次，设备指纹不落库，长期存储只保留 HMAC 结果或激活码后缀。
- **授权运营可观察、可追溯**：仪表盘汇总应用、激活码、激活趋势和客户端失败，关键管理操作及客户端授权结果进入可筛选日志，删除激活码仍保留历史链路。
- **从接口试用到客户端接入**：后台内置接口文档、调用流程、可复制示例、多框架 SDK/组件代码和真实 API Playground，减少从创建应用到完成集成的切换成本。

## 适用场景

- 为一个或多个应用发放激活码。
- 按平台区分授权，例如 Windows、macOS、Linux、iOS、Android 或 Web。
- 需要客户端通过 `app_id`、`app_secret`、激活码和设备指纹完成激活与校验。
- 需要支持“一码一机”，同时允许受控的自助换机。
- 需要由平台方统一管理多个客户或业务线，同时确保租户数据和管理权限隔离。
- 需要管理后台查看授权状态、筛选激活码、处理禁用/启用/删除和查看操作日志。
- 需要通过统计、审计日志和失败码定位授权使用情况与客户端问题。
- 希望自托管授权服务，并避免长期保存完整明文激活码、应用密钥和设备指纹。

## 功能全景

### 多租户与管理员

- 应用、生成批次、激活码和日志按租户隔离，服务端所有资源访问都带租户约束。
- 超级管理员可创建、启用、禁用和删除符合条件的租户，重设租户管理员密码，并显式切换租户管理业务数据。
- 租户管理员固定在所属租户内工作；禁用租户会同时阻断其管理会话和客户端授权请求，但不会改写原有授权状态。
- 管理员支持登录、8 小时 JWT 会话、修改密码和 bootstrap 密钥恢复。

### 授权管理

- 多应用、多平台授权管理。
- 应用支持描述和授权码购买链接，并可启用、禁用、受限删除和更换密钥。
- 禁用应用会立即阻断其客户端授权操作，同时保留应用下激活码的原始状态。
- 应用密钥只在创建或更换时展示一次，数据库保存 HMAC 哈希。

### 激活码

- 批量生成激活码，单次生成数量由服务端限制。
- 内置周卡、月卡、季卡、年卡四类套餐。
- 激活码明文只在生成响应中展示一次，数据库不保存完整明文。
- 支持按状态、应用、平台、套餐、关键字等条件筛选。
- 支持单个或批量禁用、启用和软删除，批量操作返回请求数和实际更新数。
- 删除状态优先于禁用、过期和激活状态，授权生命周期保持清晰且不可逆。

### 激活、校验与换机

- 首次激活时才计算过期时间，而不是从生成时间开始计时。
- 周卡按 7 天计算；月卡、季卡、年卡按自然月或自然年计算。
- 默认一码一机，校验时要求设备指纹匹配。
- 同一设备重复激活同一激活码会返回当前授权信息。
- 支持最多 3 次自助解绑迁移，相邻两次有效解绑至少间隔 24 小时。
- 解绑后只释放设备关系，不重算激活时间和到期时间；新设备通过激活接口完成重绑。
- 管理员可以手动解绑符合条件的已激活授权，且不消耗用户自助迁移次数。

### 运营、审计与开发支持

- 仪表盘展示应用与激活码总量、激活率、状态和套餐分布、7 天授权走势、应用排行及客户端失败数。
- 操作日志支持按应用、动作、结果和关键字检索，记录关键管理行为以及进入激活码判定后的激活、校验和解绑结果。
- 接入文档提供客户端接口、流程图、TypeScript/JavaScript SDK、cURL 和 HTML 示例。
- SDK 页面提供 React、Vue、React Native、Angular、Svelte、Electron、Flutter/Dart 和 TypeScript Core 示例代码。
- Playground 可在后台预览请求并调用真实客户端接口，便于联调激活、校验和解绑流程。

### 安全与审计

- `/api/admin/*` 除登录外使用 Bearer Token 鉴权。
- 客户端接口校验 `app_id` 和 `app_secret`。
- 激活码、应用密钥和设备指纹均使用独立 HMAC 密钥计算后存储。
- API 统一返回结构，不向客户端暴露 SQL 错误、裸异常或密钥信息。
- 删除激活码采用软删除，便于审计和避免破坏历史记录。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 后端 | Cloudflare Workers、Hono、TypeScript |
| 数据库 | Cloudflare D1、SQL migration |
| 管理后台 | React、Vite、Ant Design Pro |
| 包管理 | pnpm workspace |
| 部署 | Wrangler、Worker assets |
| 测试 | Vitest |

## 项目结构

```text
.
├── admin/        # React + Vite + Ant Design Pro 管理后台
├── docs/         # 架构、API、业务规则、安全、部署等文档
├── migrations/   # Cloudflare D1 migration
├── worker/       # Cloudflare Workers + Hono API
├── AGENTS.md     # 编码 Agent 开发规范
└── pnpm-workspace.yaml
```

请求流概览：

```text
Browser/Admin
  -> Cloudflare Worker
  -> Hono routes
  -> service business rules
  -> repository D1 queries
  -> unified JSON response
```

非 `/api/*` 请求由 Worker assets 回退到管理后台静态资源。

## 本地开发

环境要求：

- Node.js `>=20.11.0`
- pnpm `>=11.7.0`
- Cloudflare Wrangler，由 `worker/package.json` 管理

安装依赖并准备本地密钥：

```bash
pnpm install
pnpm env:init
```

初始化本地 D1 并启动开发环境：

```bash
pnpm db:migrate:local
pnpm dev
```

开发后台访问 `http://localhost:5173`，前端由 Vite 提供热更新，接口请求代理到本地 Worker。

本地 Worker 默认监听 `http://localhost:8787`。如需验证 Worker 静态资源托管效果，可以先执行 `pnpm build`，再单独启动 Worker。

默认 bootstrap 管理员由 `worker/.dev.vars` 和 `worker/wrangler.toml` 控制：

- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`

首次登录时如果管理员不存在，Worker 会自动创建。

本地开发读取公开的 `worker/wrangler.toml` 顶层配置。生产部署读取不提交的 `worker/wrangler.production.toml`，并通过 `wrangler secret put --config wrangler.production.toml --env production` 管理密钥。

## 常用命令

```bash
pnpm dev               # 同时启动 Worker 和管理后台
pnpm env:init          # 生成本地 Worker 密钥
pnpm env:check:production # 检查生产 secret 名称
pnpm build             # 构建管理后台和 Worker
pnpm type-check        # 运行前后端类型检查
pnpm test              # 运行 Worker 测试
pnpm db:migrate:local  # 应用本地 D1 迁移
pnpm db:migrate:remote # 应用生产 D1 迁移
pnpm deploy            # 构建并部署生产 Worker
```

## 验证

```bash
pnpm build
pnpm type-check
pnpm test
```

纯文档修改通常不需要运行测试；代码、接口、数据库或部署流程变更应按影响范围运行对应验证命令。

## 部署

部署目标为 Cloudflare Workers + D1 + Worker assets。

首次部署前需要：

1. 创建生产 D1 数据库。
2. 从 `worker/wrangler.production.example.toml` 复制生成本地私有 `worker/wrangler.production.toml`。
3. 在生产配置中填写 Worker 名称、自定义域名、生产 D1 `database_id` 和 bootstrap 用户名。
4. 使用 Wrangler secrets 写入 `JWT_SECRET`、`CODE_HMAC_SECRET`、`APP_SECRET_HMAC_SECRET`、`DEVICE_HMAC_SECRET` 和 `ADMIN_BOOTSTRAP_PASSWORD`。
5. 检查生产 secret 名称。
6. 执行远程 D1 migration。
7. 构建并部署。

```bash
pnpm env:check:production
pnpm db:migrate:remote
pnpm deploy
```

生产 D1、生产域名和 bootstrap 用户名配置在本地私有 `worker/wrangler.production.toml` 的 `env.production` 中，详见 [部署指南](docs/DEPLOYMENT.md)。

部署后建议检查：

- `/api/health` 返回正常。
- 管理后台能加载并完成登录。
- 应用创建后只展示一次 `app_secret`。
- 生成激活码后只展示一次明文 `codes`。
- 客户端激活、校验、解绑接口按预期返回。

## 开源与安全

- 本项目采用 [MIT License](LICENSE)。
- 贡献方式见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 漏洞报告方式见 [SECURITY.md](SECURITY.md)。
- 公开仓库不提交 `worker/.dev.vars`、`worker/wrangler.production.toml`、真实密钥、生产 D1 ID 或构建产物。
- 生产配置从 `worker/wrangler.production.example.toml` 复制为不提交的 `worker/wrangler.production.toml` 后再填写真实值。

## 文档

更详细的设计、接口和维护规则拆分在主题文档中：

- [文档索引](docs/README.md)
- [开发指南](docs/DEVELOPMENT.md)
- [架构说明](docs/ARCHITECTURE.md)
- [业务规则](docs/BUSINESS_RULES.md)
- [前端规范](docs/FRONTEND.md)
- [API 规范](docs/API.md)
- [安全规范](docs/SECURITY.md)
- [数据库规范](docs/DATABASE.md)
- [部署指南](docs/DEPLOYMENT.md)
