# License Manager 授权管理系统

[English](#english) | **简体中文**

轻量、可自托管的多租户软件授权管理系统（License Manager），面向独立软件、桌面工具、插件、脚本工具和内部系统，覆盖从**应用接入、批量发码、设备激活、授权校验、受控换机到审计追踪**的完整闭环。

后端与数据库运行在 Cloudflare Workers + D1 之上，API 使用 Hono 构建，管理后台由 React + Vite + Ant Design Pro 实现。Worker 同时托管后端接口与管理后台静态资源，可以较低运维成本部署到 Cloudflare 边缘网络。

---

## 项目介绍

### 核心特性

- **授权周期从真正使用时开始**：天卡、两天卡、三天卡、周卡、月卡、季卡、年卡、永久卡均从首次激活开始计算有效期，提前生成和分发激活码不会损耗客户授权时长。
- **一码一机，兼顾换机体验**：默认绑定单一设备，同设备重复激活保持幂等；用户可在次数和冷却时间约束下自助解绑，管理员也可处理例外换机。
- **多租户统一运营**：一套部署可隔离管理多个客户、团队或业务线；超级管理员管理租户并切换业务上下文，租户管理员只能访问所属租户数据。
- **敏感凭证最小化存储**：应用密钥和设备指纹不落库，设备指纹不落库，长期存储只保留 HMAC 结果或激活码后缀；激活码明文可选加密存储（AES-256-GCM），仅在分销取码时解密返回。
- **授权运营可观察、可追溯**：仪表盘汇总应用、激活码、激活趋势和客户端失败；关键管理操作与客户端授权结果进入可筛选日志；删除激活码仍保留历史链路（软删除），也可物理强制删除。
- **分销商自动发货**：第三方发货系统可通过取码接口按应用/套餐每次取走一张未售出卡密，自动发给买家；卡密状态完整流转（未激活 → 已售出 → 已激活），不会重复发放。
- **从接口试用到客户端接入**：后台内置接口文档、调用流程、可复制示例、多框架 SDK/组件代码和真实 API Playground。

### 技术栈

| 模块 | 技术 |
| --- | --- |
| 后端 | Cloudflare Workers、Hono、TypeScript |
| 数据库 | Cloudflare D1、SQL migration |
| 管理后台 | React、Vite、Ant Design Pro |
| 包管理 | pnpm workspace |
| 部署 | Wrangler、Worker assets |
| 测试 | Vitest |

### 适用场景

- 为一个或多个应用发放激活码，并按 Windows / macOS / Linux / iOS / Android / Web 等平台区分授权。
- 客户端通过 `app_id`、`app_secret`、激活码和设备指纹完成激活与校验。
- 需要"一码一机"，同时允许受控的自助换机。
- 平台方统一管理多个客户或业务线，同时确保租户数据和管理权限隔离。
- 希望在自托管的前提下，避免明文保存应用密钥和设备指纹；激活码明文加密存储，仅在分销取码时解密。

---

## 使用教程

> [!TIP]
> **想让 AI 直接帮你接入卡密系统？** 把接入提示词 [docs/INTEGRATION_PROMPT.md](docs/INTEGRATION_PROMPT.md) 连同你的项目源码一起交给 AI 编码助手，按提示词即可完成激活、校验、解绑、购买引导等全部接入工作，无需手动逐接口对接。

### 一、管理后台使用

#### 1. 登录后台

访问部署后的管理后台地址（本地开发为 `http://localhost:5173`），使用 bootstrap 管理员账号登录：

- 本地环境账号由 `worker/.dev.vars` 中的 `ADMIN_BOOTSTRAP_USERNAME` / `ADMIN_BOOTSTRAP_PASSWORD` 控制，首次登录时系统自动创建。
- 登录后会话有效期为 8 小时（JWT）。

#### 2. 创建应用

进入「应用管理」，创建应用并选择目标平台。创建成功后：

- 系统仅展示**一次** `app_secret`（应用密钥），请立即保存；数据库只存 HMAC 哈希，丢失后无法找回，只能更换密钥。
- 应用支持描述、购买链接，可启用/禁用、受限删除和更换密钥。
- 记录应用的 `app_id` 和 `app_secret`，客户端接入时使用。

#### 3. 生成激活码

进入「发码」页面，选择应用、平台和套餐，设置生成数量，批量生成激活码。系统内置 6 种套餐：

| 套餐 | 说明 | 有效期计算 |
| --- | --- | --- |
| 天卡（daily） | 1 天 | 首次激活时间 + 1 天 |
| 周卡（weekly） | 7 天 | 首次激活时间 + 7 天 |
| 月卡（monthly） | 1 个月 | 首次激活时间 + 1 个自然月 |
| 季卡（quarterly） | 3 个月 | 首次激活时间 + 3 个自然月 |
| 年卡（yearly） | 1 年 | 首次激活时间 + 1 个自然年 |
| 永久卡（lifetime） | 永久 | 固定到期 `2099-12-31T23:59:59Z` |

> 说明：天卡与永久卡为本仓库在基础上扩展的套餐类型（迁移文件 `migrations/0004_add_daily_lifetime_plans.sql`）。激活码明文只在生成响应中展示一次，请立即保存。

生成后可在「激活码管理」中按状态、应用、平台、套餐、关键字筛选，支持单个/批量禁用、启用、软删除，以及管理员手动解绑符合条件的已激活授权（不消耗用户自助迁移次数）。

#### 4. 激活、校验与换机规则

- 激活码默认绑定**一台设备**，校验时要求设备指纹匹配。
- 同一设备重复激活同一激活码返回当前授权信息（幂等）。
- 每个激活码支持最多 **3 次**自助解绑迁移，相邻两次有效解绑至少间隔 **24 小时**。
- 解绑只释放设备关系，不重算激活时间和到期时间；新设备通过激活接口完成重绑。

### 二、客户端接入

#### 前置条件

- 应用已创建，取得 `app_id` 与 `app_secret`。
- 已生成激活码并安全保存明文。
- 客户端能稳定计算自身设备指纹（如机器码哈希），同一设备保持一致。

#### 1. 激活

```bash
curl -X POST https://your-domain.example.com/api/client/activate \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "你的应用ID",
    "app_secret": "你的应用密钥",
    "code": "激活码明文",
    "device_fingerprint": "设备指纹"
  }'
```

激活成功返回授权信息，关键字段：

```json
{
  "ok": true,
  "data": {
    "app": { "id": "app_xxx", "name": "我的软件" },
    "code": { "code": "XXXX-XXXX-XXXX-XXXX", "plan_code": "monthly" },
    "activated_at": "2026-08-23T10:00:00.000Z",
    "expires_at": "2026-09-23T10:00:00.000Z",
    "remaining_seconds": 2678400,
    "rebind_count": 0,
    "max_rebinds": 3
  }
}
```

#### 2. 校验

客户端在启动/定时校验时调用，参数与激活一致：

```bash
curl -X POST https://your-domain.example.com/api/client/verify \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "你的应用ID",
    "app_secret": "你的应用密钥",
    "code": "激活码明文",
    "device_fingerprint": "设备指纹"
  }'
```

返回当前授权状态（未激活 / 已激活 / 已过期 / 设备不匹配等，通过统一失败码区分）。

#### 3. 解绑换机

```bash
curl -X POST https://your-domain.example.com/api/client/unbind-device \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "你的应用ID",
    "app_secret": "你的应用密钥",
    "code": "激活码明文",
    "device_fingerprint": "当前设备指纹"
  }'
```

#### 4. 应用信息

```bash
curl -X POST https://your-domain.example.com/api/client/app-info \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "你的应用ID",
    "app_secret": "你的应用密钥"
  }'
```

返回应用名称、描述、购买链接等公开信息，可用于客户端展示。

> 完整的客户端/管理端接口规范见 [docs/API.md](docs/API.md)；后台「SDK 页面」提供 React、Vue、React Native、Angular、Svelte、Electron、Flutter/Dart、TypeScript Core 等示例代码，后台「Playground」可直接联调激活、校验、解绑。如需将客户端软件完整接入本系统（含购买引导等要求），可直接使用 [docs/INTEGRATION_PROMPT.md](docs/INTEGRATION_PROMPT.md) 中的接入提示词交给 AI 编码助手执行。

---

## 部署教程

### 环境要求

- Node.js `>=20.11.0`
- pnpm `>=11.7.0`
- Cloudflare 账号（生产部署）
- Wrangler（由 `worker/package.json` 管理）

### 一、本地开发

```bash
# 1. 安装依赖并生成本地密钥
pnpm install
pnpm env:init

# 2. 初始化本地 D1 数据库
pnpm db:migrate:local

# 3. 启动开发环境（Worker + 管理后台）
pnpm dev
```

- 管理后台：`http://localhost:5173`（Vite 热更新，接口代理到本地 Worker）
- 本地 Worker：`http://localhost:8787`
- 本地 bootstrap 管理员由 `worker/.dev.vars` 与 `worker/wrangler.toml` 控制；首次登录自动创建。

### 二、生产部署（Cloudflare Workers + D1）

首次部署步骤：

1. **创建生产 D1 数据库**：在 Cloudflare 控制台（或 `wrangler d1 create`）创建 D1 数据库，记录 `database_id`。
2. **生成生产配置**：复制 `worker/wrangler.production.example.toml` 为本地私有文件 `worker/wrangler.production.toml`（该文件**不提交**到 Git）。
3. **填写生产配置**：在 `env.production` 中填写 Worker 名称、自定义域名、生产 D1 `database_id` 与 bootstrap 用户名。
4. **设置生产 secrets**（每个都单独执行）：

```bash
wrangler secret put JWT_SECRET --config wrangler.production.toml --env production
wrangler secret put CODE_HMAC_SECRET --config wrangler.production.toml --env production
wrangler secret put APP_SECRET_HMAC_SECRET --config wrangler.production.toml --env production
wrangler secret put DEVICE_HMAC_SECRET --config wrangler.production.toml --env production
wrangler secret put ADMIN_BOOTSTRAP_PASSWORD --config wrangler.production.toml --env production
```

5. **检查 secret 名称**：`pnpm env:check:production`
6. **应用远程 D1 迁移**：`pnpm db:migrate:remote`
7. **构建并部署**：`pnpm deploy`

部署后验证清单：

- `GET /api/health` 返回正常；
- 管理后台能加载并完成登录；
- 创建应用后 `app_secret` 只展示一次；
- 生成激活码后明文 `codes` 只展示一次；
- 客户端激活、校验、解绑接口按预期返回。

> 详细部署说明见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。注意：`worker/.dev.vars`、`worker/wrangler.production.toml`、真实密钥、生产 D1 ID 与构建产物**均不得提交**到 Git。

---

## 常用命令

```bash
pnpm dev                  # 同时启动 Worker 和管理后台
pnpm env:init             # 生成本地 Worker 密钥
pnpm env:check:production # 检查生产 secret 名称
pnpm build                # 构建管理后台和 Worker
pnpm type-check           # 前后端类型检查
pnpm test                 # 运行 Worker 测试
pnpm db:migrate:local     # 应用本地 D1 迁移
pnpm db:migrate:remote    # 应用生产 D1 迁移
pnpm deploy               # 构建并部署生产 Worker
```

## 项目结构

```text
.
├── admin/        # React + Vite + Ant Design Pro 管理后台
├── docs/         # 架构、API、业务规则、安全、部署等文档
├── migrations/   # Cloudflare D1 migration
├── worker/       # Cloudflare Workers + Hono API
├── AGENTS.md     # 编码 Agent 开发规范
├── WORKFLOW.md   # 分支工作流规则
└── pnpm-workspace.yaml
```

请求流：`Browser/Admin -> Cloudflare Worker -> Hono routes -> service 业务规则 -> repository D1 查询 -> 统一 JSON 响应`；非 `/api/*` 请求由 Worker assets 回退到管理后台静态资源。

## 工作流规则

本仓库遵循 [WORKFLOW.md](WORKFLOW.md) 定义的分支工作流：

- 所有修改一律在 `feature/custom-plans` 分支进行；
- 该分支不得合并/推送到 `main`；
- `main` 仅用于从 `upstream`（原作者仓库）拉取合并上游修改。

## 文档索引

- [文档索引](docs/README.md)
- [开发指南](docs/DEVELOPMENT.md)
- [架构说明](docs/ARCHITECTURE.md)
- [业务规则](docs/BUSINESS_RULES.md)
- [前端规范](docs/FRONTEND.md)
- [API 规范](docs/API.md)
- [版本控制 API](docs/API_VERSIONS.md)
- [安全规范](docs/SECURITY.md)
- [数据库规范](docs/DATABASE.md)
- [部署指南](docs/DEPLOYMENT.md)

## 开源与安全

- 本项目采用 [MIT License](LICENSE)。
- 贡献方式见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 漏洞报告方式见 [SECURITY.md](SECURITY.md)。
- 公开仓库不提交 `worker/.dev.vars`、`worker/wrangler.production.toml`、真实密钥、生产 D1 ID 或构建产物。

---

# English

[简体中文](#license-manager-授权管理系统) | **English**

## Project Introduction

A lightweight, self-hostable, multi-tenant software licensing system for independent software, desktop tools, plugins, scripts, and internal systems. It covers the complete workflow from application onboarding and batch key issuance to device activation, license verification, controlled device transfer, and audit trails.

The backend and database run on Cloudflare Workers and D1, the API is built with Hono, and the admin console is built with React, Vite, and Ant Design Pro. The Worker serves both the API and the admin static assets, allowing low-overhead deployment to the Cloudflare edge.

### Highlights

- **License period starts when the customer starts using it**: daily, weekly, monthly, quarterly, yearly, and lifetime licenses all begin at first activation, so early issuance does not consume the customer's license period.
- **One key per device, painless device changes**: activation is device-bound and idempotent on the same device; users can self-unbind within transfer and cooldown limits, and administrators can handle eligible exceptions.
- **Multi-tenant operation in one deployment**: super administrators manage tenants and switch business context; tenant administrators only access their own tenant's data.
- **Minimized credential storage**: full license keys and app secrets are shown only once, device fingerprints are never persisted, and only HMAC values or key suffixes are stored long-term.
- **Observable and auditable**: the dashboard aggregates license inventory, activation trends, and client failures; searchable logs cover admin actions and client authorization outcomes; deletion is soft to preserve history.
- **From API exploration to integration in one console**: built-in API docs, workflow guidance, copyable examples, multi-framework SDK samples, and a live API Playground.

### Tech Stack

| Area | Technology |
| --- | --- |
| Backend | Cloudflare Workers, Hono, TypeScript |
| Database | Cloudflare D1, SQL migrations |
| Admin console | React, Vite, Ant Design Pro |
| Package management | pnpm workspace |
| Deployment | Wrangler, Worker assets |
| Testing | Vitest |

## Usage Guide

> [!TIP]
> **Want an AI to integrate the licensing system for you?** Hand the integration prompt [docs/INTEGRATION_PROMPT.md](docs/INTEGRATION_PROMPT.md) together with your project source code to an AI coding assistant — it will implement activation, verification, unbind/transfer, and purchase guidance without manual per-API work.

### 1. Admin Console

1. **Log in** at the deployed admin URL (locally `http://localhost:5173`). The bootstrap admin is controlled by `ADMIN_BOOTSTRAP_USERNAME` / `ADMIN_BOOTSTRAP_PASSWORD` in `worker/.dev.vars` and is auto-created on first login. Sessions last 8 hours (JWT).
2. **Create an application** under App Management. The `app_secret` is shown **only once** — save it immediately (the database stores only an HMAC hash). Keep the `app_id` and `app_secret` for client integration.
3. **Generate license keys** under Code Generation. Six built-in plans:

| Plan | Description | Expiration |
| --- | --- | --- |
| Daily | 1 day | first activation + 1 day |
| Weekly | 7 days | first activation + 7 days |
| Monthly | 1 month | first activation + 1 calendar month |
| Quarterly | 3 months | first activation + 3 calendar months |
| Yearly | 1 year | first activation + 1 calendar year |
| Lifetime | permanent | fixed at `2099-12-31T23:59:59Z` |

> Daily and lifetime are extensions added in this repository (`migrations/0004_add_daily_lifetime_plans.sql`). Plaintext keys are shown only once in the generation response.

4. **Activation & transfer rules**: one key binds to one device by default; re-activation on the same device is idempotent; up to 3 self-service unbinds with at least 24 hours between valid unbinds; unbinding only releases the device relationship and never recalculates activation/expiration.

### 2. Client Integration

**Prerequisites**: an app (`app_id` + `app_secret`), a generated license key, and a stable device fingerprint.

**Activate:**

```bash
curl -X POST https://your-domain.example.com/api/client/activate \
  -H "Content-Type: application/json" \
  -d '{"app_id":"YOUR_APP_ID","app_secret":"YOUR_APP_SECRET","code":"LICENSE_KEY","device_fingerprint":"DEVICE_FINGERPRINT"}'
```

**Verify:** same payload to `POST /api/client/verify`, returns the current license status (unactivated / active / expired / device mismatch) via stable failure codes.

**Unbind / transfer:** `POST /api/client/unbind-device` with the same payload.

**App info:** `POST /api/client/app-info` with `app_id` and `app_secret`, returns public app info such as name, description, and purchase URL.

## Deployment Guide

### Local Development

```bash
pnpm install
pnpm env:init
pnpm db:migrate:local
pnpm dev
```

Admin console: `http://localhost:5173` · Local Worker: `http://localhost:8787`

### Production (Cloudflare Workers + D1)

1. Create the production D1 database and note the `database_id`.
2. Copy `worker/wrangler.production.example.toml` to the uncommitted local file `worker/wrangler.production.toml`.
3. Fill in the Worker name, custom domain, production D1 `database_id`, and bootstrap username under `env.production`.
4. Set the five secrets with `wrangler secret put ... --config wrangler.production.toml --env production`:
   `JWT_SECRET`, `CODE_HMAC_SECRET`, `APP_SECRET_HMAC_SECRET`, `DEVICE_HMAC_SECRET`, `ADMIN_BOOTSTRAP_PASSWORD`.
5. `pnpm env:check:production`
6. `pnpm db:migrate:remote`
7. `pnpm deploy`

Verify after deployment: `/api/health` returns OK; the admin console loads and login works; `app_secret` and plaintext `codes` are shown only once; client activate/verify/unbind APIs behave as expected.

> Never commit `worker/.dev.vars`, `worker/wrangler.production.toml`, real secrets, production D1 IDs, or build artifacts.

## Common Commands

```bash
pnpm dev                  # Start Worker and admin console together
pnpm env:init             # Generate local Worker secrets
pnpm env:check:production # Check production secret names
pnpm build                # Build admin console and Worker
pnpm type-check           # Run backend and frontend type checks
pnpm test                 # Run Worker tests
pnpm db:migrate:local     # Apply local D1 migrations
pnpm db:migrate:remote    # Apply production D1 migrations
pnpm deploy               # Build and deploy the production Worker
```

## Project Structure

```text
.
├── admin/        # React + Vite + Ant Design Pro admin console
├── docs/         # Architecture, API, business rules, security, deployment docs
├── migrations/   # Cloudflare D1 migrations
├── worker/       # Cloudflare Workers + Hono API
├── AGENTS.md     # Coding agent development rules
├── WORKFLOW.md   # Branch workflow policy
└── pnpm-workspace.yaml
```

## Workflow Policy

This repository follows the branch workflow defined in [WORKFLOW.md](WORKFLOW.md): all changes are made on `feature/custom-plans`; that branch is never merged or pushed to `main`; `main` is used only to pull and merge upstream (`upstream`) changes.

## Documentation

- [Documentation index](docs/README.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Business rules](docs/BUSINESS_RULES.md)
- [Frontend rules](docs/FRONTEND.md)
- [API reference](docs/API.md)
- [Version control API](docs/API_VERSIONS.md)
- [Security rules](docs/SECURITY.md)
- [Database rules](docs/DATABASE.md)
- [Deployment guide](docs/DEPLOYMENT.md)

## Open Source and Security

- Licensed under the [MIT License](LICENSE).
- Contribution guidelines: [CONTRIBUTING.md](CONTRIBUTING.md).
- Vulnerability reporting: [SECURITY.md](SECURITY.md).
- Do not commit `worker/.dev.vars`, `worker/wrangler.production.toml`, real secrets, production D1 IDs, or build artifacts.
