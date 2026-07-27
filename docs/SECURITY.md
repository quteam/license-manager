# 安全规范

本文定义不能因功能便利而放宽的安全边界。业务规则与本文冲突时，优先选择不暴露凭证、不扩大权限和不持久化明文的实现，并同步修正规范。

## 数据分类

| 数据 | 分类 | 允许出现的位置 | 禁止出现的位置 |
| --- | --- | --- | --- |
| 明文激活码 | 一次性秘密 | 生成成功响应和对应一次性 UI | 数据库、日志、URL、仓库文件 |
| `app_secret` | 长期应用凭证 | 创建/更换成功响应、客户端请求体、用户私密配置 | 数据库明文、日志、URL、SDK 示例、仓库文件 |
| 设备指纹 | 终端标识秘密 | 客户端请求体和内存中的 HMAC 输入 | 数据库明文、日志、响应、URL |
| 管理员密码/恢复密钥 | 高敏凭证 | 密码输入、哈希流程、Wrangler secret | 日志、URL、数据库明文、公开配置 |
| 激活码/应用密钥 HMAC、密码哈希 | 凭证派生值 | 对应数据库字段和服务端比较 | API 响应、管理后台展示、日志 |
| `device_hash` | 稳定设备派生标识 | 数据库、审计结构化字段、管理端 API 内部判断 | 客户端 API、管理后台可见文本、日志 message |
| Bearer JWT | 会话凭证 | Authorization header、前端 token helper | URL、日志、可提交文件 |
| 激活码后缀 | 低敏识别信息 | 管理列表、日志关联和搜索 | 不得被当作认证凭证 |

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
- 管理员登录按租户名称或 slug 与用户名联合查询；租户、用户名和密码错误使用同一响应，避免枚举租户或账号。
- 租户管理接口只允许 `super_admin`；租户管理员的租户范围只从数据库 principal 获取，忽略 `X-Tenant-Id` 覆盖。
- 超级管理员访问租户业务接口必须提供 `X-Tenant-Id`，服务端确认租户存在且启用后才执行查询或写入。
- 应用、激活码、日志和 dashboard 的管理端 SQL 必须包含租户约束；按资源 ID 更新也必须再次校验资源所属租户。
- `/api/recovery/admin-password` 不属于 `/api/admin/*`，仅用于登录失败后的管理员密码恢复；请求体必须校验 bootstrap 用户名和 `ADMIN_BOOTSTRAP_PASSWORD`，不得通过 URL 传递恢复密钥。
- 客户端接口必须同时校验 `app_id` 和 `app_secret`。
- 禁用状态的应用不得激活、校验或解绑。
- 禁用状态的租户不得登录租户管理员，也不得执行该租户的客户端授权操作。
- 所有用户输入必须经过基础类型和范围校验。
- SQL 必须使用 prepared statement 和 `.bind(...)`，不得拼接用户输入。
- 返回给前端和客户端的错误信息应稳定、简洁，不暴露内部异常、SQL 或密钥信息。
- 敏感凭证只通过 JSON 请求体或 Authorization header 传递，不得放入路径和查询参数。
- 应用密钥比较、恢复密钥比较和哈希比较应使用常量时间比较函数，避免直接字符串比较敏感派生值。
- 客户端错误判断使用稳定错误码；错误消息不得透露激活码是否属于其他应用等可枚举信息。

## 日志安全

- 操作日志可以记录设备哈希，不得记录设备指纹明文。
- 管理员手动解绑只清除设备哈希，不需要也不得要求设备指纹明文。
- 不得记录完整激活码明文。
- 失败日志应包含稳定错误码，便于排查和统计。

## 前端安全

- 管理后台 token 存储和清理统一走 `admin/src/api.ts`。
- 前端保存的当前租户 ID 只用于超级管理员的操作上下文，不是授权依据；后端始终执行角色和归属校验。
- 接口 401 或会话失效时必须清理 token 并返回登录页。
- 前端不得展示应用密钥哈希、设备哈希、设备指纹或其他敏感派生值/明文；设备只展示是否已绑定。
- Playground 和 SDK/文档示例不得持久化、预填或回显真实 `app_secret`。
- 一次性密钥或激活码弹窗关闭后，不应在页面常驻状态、URL、localStorage 或调试日志中保留。

## 安全变更检查

涉及鉴权、密钥、日志、客户端请求或新数据库字段时，至少回答：

- 新数据是否属于秘密、个人标识或可用于认证的派生值？
- 是否能只保存 HMAC、哈希、后缀或布尔状态？
- 请求失败时，日志和错误响应是否泄露存在性或凭证细节？
- 新接口是否处于正确鉴权范围，是否可能绕过 `/api/admin/*` middleware？
- SQL 是否全部绑定参数，动态片段是否来自固定白名单？
- 前端是否把 token、密钥或激活码写入 URL、持久存储或 console？
- 示例环境、生产 secret 检查和部署文档是否需要同步？
- 测试是否证明敏感字段不出现在数据库读取结果、API 响应和日志中？

## 生产要求

- 生产环境不得使用弱默认 bootstrap 密码。
- 生产环境变量应配置在私有 `worker/wrangler.production.toml` 的 `[env.production.vars]`。
- 首次创建管理员后，应立即修改密码。
- 如果不再需要 bootstrap 管理员初始化，应移除或替换相关配置。
