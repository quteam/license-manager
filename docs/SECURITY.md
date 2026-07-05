# 安全规范

## 敏感数据

- 激活码使用 HMAC 后入库。
- 应用密钥使用 HMAC 后入库。
- 更换应用密钥时只保存新密钥 HMAC，新密钥仅在响应中一次性返回，旧密钥立即失效。
- 设备指纹使用 HMAC 后入库。
- 管理员密码必须使用随机 salt 和哈希，不得明文保存。
- JWT 密钥、HMAC 密钥和生产管理员密码必须通过 Wrangler secret 管理。
- `ADMIN_BOOTSTRAP_PASSWORD` 同时作为无法登录时的管理员密码恢复密钥，必须使用高强度随机值并只保存在 Wrangler secret 或等价私密配置中。
- `.dev.vars`、`wrangler.production.toml`、真实密钥、生产账号密码和生产数据库 ID 不得提交；公开 `worker/wrangler.toml` 只保留本地开发占位配置。

## 环境变量校验

Worker 运行时会校验以下核心加密密钥：

- `JWT_SECRET`
- `CODE_HMAC_SECRET`
- `APP_SECRET_HMAC_SECRET`
- `DEVICE_HMAC_SECRET`

这些密钥必须存在，且不得使用示例占位值。

Bootstrap 初始化和密码恢复使用以下变量：

- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`

两者必须成对配置。生产环境如果启用 bootstrap 初始化或密码恢复，`ADMIN_BOOTSTRAP_PASSWORD` 必须通过 Wrangler secret 管理，并设置为高强度随机值。

生产环境使用：

```bash
cd worker
pnpm wrangler secret put JWT_SECRET --config wrangler.production.toml --env production
pnpm wrangler secret put CODE_HMAC_SECRET --config wrangler.production.toml --env production
pnpm wrangler secret put APP_SECRET_HMAC_SECRET --config wrangler.production.toml --env production
pnpm wrangler secret put DEVICE_HMAC_SECRET --config wrangler.production.toml --env production
pnpm wrangler secret put ADMIN_BOOTSTRAP_PASSWORD --config wrangler.production.toml --env production
```

## 接口安全

- `/api/admin/*` 必须通过 Bearer Token 鉴权。
- `/api/recovery/admin-password` 不属于 `/api/admin/*`，仅用于登录失败后的管理员密码恢复；请求体必须校验 bootstrap 用户名和 `ADMIN_BOOTSTRAP_PASSWORD`，不得通过 URL 传递恢复密钥。
- 客户端接口必须同时校验 `app_id` 和 `app_secret`。
- 禁用状态的应用不得激活、校验或解绑。
- 所有用户输入必须经过基础类型和范围校验。
- SQL 必须使用 prepared statement 和 `.bind(...)`，不得拼接用户输入。
- 返回给前端和客户端的错误信息应稳定、简洁，不暴露内部异常、SQL 或密钥信息。

## 日志安全

- 操作日志可以记录设备哈希，不得记录设备指纹明文。
- 管理员手动解绑只清除设备哈希，不需要也不得要求设备指纹明文。
- 不得记录完整激活码明文。
- 失败日志应包含稳定错误码，便于排查和统计。

## 前端安全

- 管理后台 token 存储和清理统一走 `admin/src/api.ts`。
- 接口 401 或会话失效时必须清理 token 并返回登录页。
- 前端不得展示应用密钥哈希、设备哈希以外的敏感明文。

## 生产要求

- 生产环境不得使用弱默认 bootstrap 密码。
- 生产环境变量应配置在私有 `worker/wrangler.production.toml` 的 `[env.production.vars]`。
- 首次创建管理员后，应立即修改密码。
- 如果不再需要 bootstrap 管理员初始化，应移除或替换相关配置。
