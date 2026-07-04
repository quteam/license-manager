# 部署指南

部署目标为 Cloudflare Workers + D1 + Worker assets。

## 创建 D1 数据库

```bash
pnpm --filter @license-manager/worker db:create
```

将返回的 `database_id` 写入本地私有生产配置 `worker/wrangler.production.toml` 的 `[[env.production.d1_databases]]`。

公开提交的 `worker/wrangler.toml` 仅用于本地开发，顶层 `[[d1_databases]]` 保持占位值即可；线上部署和远程迁移统一通过 `worker/wrangler.production.toml` 的 `env.production` 读取生产 D1 绑定。

## 创建私有生产配置

生产配置不提交到仓库，首次部署前从示例文件复制：

```bash
cp worker/wrangler.production.example.toml worker/wrangler.production.toml
```

然后按实际生产环境修改 `worker/wrangler.production.toml`。

## 设置生产变量

确认 `worker/wrangler.production.toml` 的生产环境名称、域名、变量和 D1：

```toml
[env.production]
name = "license-manager"
workers_dev = false
preview_urls = true
routes = [
  { pattern = "license.example.com", zone_name = "example.com", custom_domain = true, enabled = true, previews_enabled = false }
]

[env.production.vars]
ADMIN_BOOTSTRAP_USERNAME = "admin"

[[env.production.d1_databases]]
binding = "DB"
database_name = "license_manager"
database_id = "00000000-0000-0000-0000-000000000000"
migrations_dir = "../migrations"
```

`pnpm deploy` 会通过 `--config wrangler.production.toml --env production` 部署生产环境；显式设置 `[env.production].name` 用于保持线上 Worker 名称为 `license-manager`，避免 Wrangler 默认生成 `license-manager-production`。

生产自定义域名也由 `worker/wrangler.production.toml` 管理。不要只在 Cloudflare Dashboard 中维护 Worker 路由，否则下次 Wrangler 部署会提示本地配置与远程配置不一致，并可能用本地配置覆盖远程路由。

## 设置生产密钥

```bash
cd worker
pnpm wrangler secret put JWT_SECRET --config wrangler.production.toml --env production
pnpm wrangler secret put CODE_HMAC_SECRET --config wrangler.production.toml --env production
pnpm wrangler secret put APP_SECRET_HMAC_SECRET --config wrangler.production.toml --env production
pnpm wrangler secret put DEVICE_HMAC_SECRET --config wrangler.production.toml --env production
pnpm wrangler secret put ADMIN_BOOTSTRAP_PASSWORD --config wrangler.production.toml --env production
```

生产环境还应确认：

- `ADMIN_BOOTSTRAP_USERNAME`

`ADMIN_BOOTSTRAP_PASSWORD` 同时用于忘记管理员密码时的恢复密钥，生产环境必须设置为高强度随机值并仅通过 Wrangler secret 管理。

## 执行远程迁移

```bash
pnpm db:migrate:remote
```

该命令会通过 `--config wrangler.production.toml --env production` 应用生产环境 D1 迁移。

## 构建与部署

```bash
pnpm deploy
```

根目录 `pnpm deploy` 会先执行 `pnpm build:production`，再通过 `wrangler deploy --config wrangler.production.toml --env production` 部署 Worker。

## 部署前检查

- `worker/wrangler.production.toml` 已存在且不会提交。
- `worker/wrangler.production.toml` 的 `[[env.production.d1_databases]]` 已配置生产 D1 `database_id`。
- `worker/wrangler.production.toml` 的 `[env.production].name` 已配置为生产 Worker 名称 `license-manager`。
- `worker/wrangler.production.toml` 的 `[env.production].routes` 已包含生产自定义域名。
- `worker/wrangler.production.toml` 的 `[env.production.vars]` 已配置生产 bootstrap 用户名。
- 生产密钥已通过 `wrangler secret put --config wrangler.production.toml --env production` 设置。
- `ADMIN_BOOTSTRAP_PASSWORD` 已保存为高强度私密恢复密钥。
- 远程迁移已执行。
- 前端构建产物能被 Worker assets 托管。
- 生产环境不使用弱默认 bootstrap 密码。

## 部署后检查

- 访问 `/api/health` 返回正常。
- 管理后台能加载。
- 管理员能登录。
- 应用创建后只展示一次 `app_secret`。
- 生成激活码后只展示一次明文 `codes`。
- 客户端激活、校验、解绑接口可按预期返回。
