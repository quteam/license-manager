# EdgeOne Pages 部署指南

本项目除 Cloudflare Workers 外，还支持一键部署到腾讯云 **EdgeOne Pages**（Makers）。EdgeOne 部署使用平台原生 **Blob 存储** 作为持久层（Node 云函数 + Hono），业务规则、API 契约与管理后台与 Cloudflare 版本完全一致，两套部署可独立运行、互不依赖。

> 平台差异速览：Cloudflare = Workers + D1(SQL)；EdgeOne = 云函数(Node 20 运行时) + Blob(文档模型)。构建环境要求的 Node 版本另见下文「构建环境 Node 版本要求」。
> 两套存储驱动实现同一组 Repository 方法契约（见 `docs/ARCHITECTURE.md`），service 层业务规则完全共享。

## 一键部署

在 GitHub 仓库页面可使用部署按钮（仓库为私有时，仅仓库协作者可完成授权）：

| 平台 | 按钮 |
| --- | --- |
| EdgeOne Makers · 国际站 | [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=license-manager&repository-url=https://github.com/quteam/license-manager&install-command=corepack%20pnpm%20install%20--frozen-lockfile&build-command=corepack%20pnpm%20--filter%20%40license-manager%2Fadmin%20run%20build%20%26%26%20node%20scripts%2Fbuild-edgeone.mjs&output-directory=admin/dist&env=JWT_SECRET) |
| EdgeOne Makers · 中国站 | [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=license-manager&repository-url=https://github.com/quteam/license-manager&install-command=corepack%20pnpm%20install%20--frozen-lockfile&build-command=corepack%20pnpm%20--filter%20%40license-manager%2Fadmin%20run%20build%20%26%26%20node%20scripts%2Fbuild-edgeone.mjs&output-directory=admin/dist&env=JWT_SECRET) |

部署按钮只预填了构建参数与第一个密钥，其余环境变量需要在部署完成后的项目设置中补齐（见下文）。Cloudflare 的对应按钮与两平台按钮总表见 [README](../README.md#一键部署) 与 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 环境变量

在 EdgeOne 控制台「项目设置 → 环境变量」（或 CLI `edgeone makers env set`）配置：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `JWT_SECRET` | ✅ | 管理后台会话 JWT 签名密钥，建议 `openssl rand -hex 32` |
| `CODE_HMAC_SECRET` | ✅ | 激活码 HMAC 哈希密钥 |
| `APP_SECRET_HMAC_SECRET` | ✅ | 应用密钥 HMAC 哈希密钥 |
| `DEVICE_HMAC_SECRET` | ✅ | 设备指纹 HMAC 哈希密钥 |
| `ADMIN_BOOTSTRAP_USERNAME` | 可选 | bootstrap 超级管理员用户名，与密码成对配置 |
| `ADMIN_BOOTSTRAP_PASSWORD` | 可选 | bootstrap 管理员密码兼管理员密码恢复密钥，首次登录自动创建 |
| `CODE_PLAINTEXT_ENCRYPTION_KEY` | ✅ | 激活码明文 AES-256-GCM 加密密钥（生成/取码/后台展示均需此密钥解密） |
| `BLOB_NAMESPACE` | 可选 | Blob 命名空间名称，默认 `license-manager` |

与 Cloudflare 部署的变量名完全一致；HMAC/AES 密钥一旦启用不可更换（否则已哈希数据无法匹配）。

## 首次启动行为

- Blob 部署没有 SQL 迁移。应用首次请求时自动幂等写入种子数据：默认租户（`default`）与全部套餐（天卡/两天卡/三天卡/周卡/月卡/季卡/年卡/永久卡），与 D1 迁移 `0001/0004/0006` 的种子保持一致。
- bootstrap 管理员在首次登录时自动创建（与 Cloudflare 行为一致）。

## 环境变量同步注意（CLI 部署）

`edgeone makers deploy` 会在**仓库根目录**创建/同步 `.env`，并在部署时与项目环境变量双向同步：

- **本地 `.env` 为空会清空项目已配置的环境变量**（实测踩坑，会导致整站 `/api/*` 报 `JWT_SECRET is not configured`）。部署前请确认根目录 `.env` 内容完整（可从控制台复制或 `edgeone makers env pull` 拉取），或统一在控制台维护环境变量；
- 部署完成后建议删除根目录 `.env`：wrangler 会从仓库根向上查找并**优先加载 `.env`**，残留的 EdgeOne 密钥会覆盖本地 `.dev.vars`，导致本地 Cloudflare 开发登录异常；
- 恢复方式：`edgeone makers env set <KEY> <VALUE>` 逐项重设后重新部署（环境变量按部署快照生效，改完必须重新部署，生效约有 1 分钟延迟）；
- 上述流程已固化为 `scripts/deploy-edgeone.mjs`（见下方 `pnpm deploy:edgeone`）：脚本会保证部署前 `.env` 非空、部署后自动清理，避免清空远端变量或污染本地开发密钥。

## 构建环境 Node 版本要求

EdgeOne 构建环境的 Node 版本由 `edgeone.json` 的 `nodeVersion` 决定，当前固定为 `22.17.1`，**不得降到 22.13 以下**。三条硬性约束：

- `packageManager` 锁定的 pnpm 11.7.0 要求 Node `>=22.13`，Node 20 上 pnpm 会直接拒绝启动；
- 前端构建用的 Vite 8 要求 `^20.19.0 || >=22.12.0`，Node 20.18.0 不满足；
- Node 20.18.0 内置 corepack 0.29.3，只带 npm 轮换前的旧签名公钥，`corepack pnpm install` 在拉取版本元数据时会验签失败，报 `Cannot find matching keyid` 并中断安装（Node 22.17.1 内置 corepack 0.33.0、Node 24.5.0 内置 0.34.0，都已包含新公钥）。

因此 Git 导入建项目时，安装命令与编译命令保持 `corepack pnpm ...` 原样即可。控制台「构建部署配置」同样提供 Node.js 版本选项，需与 `edgeone.json` 的 `nodeVersion` 保持一致：**两处都设为 `22.17.1` 或 `24.5.0`**（平台预装版本中 `22.11.0` 仍然过旧，不要选）。日后若再次出现 `Cannot find matching keyid`，说明 npm 又轮换了签名密钥，处理方式是把两处的 Node 版本一并提到更新的版本（corepack 随 Node 一起更新）。

## 构建（本地或 CLI）

```bash
# 构建：admin 前端产物 + 云函数包（cloud-functions/api/[[default]].js，不提交）
pnpm install
pnpm build:edgeone

# 本地开发（需 edgeone CLI 并完成 link；可联调云函数与 Blob）
pnpm dev:edgeone        # 等价 edgeone makers dev，本地端口 8088

# 部署（安全包装：部署前保证 .env 非空、部署后清理）
pnpm deploy:edgeone     # 等价 node scripts/deploy-edgeone.mjs，内部调用 edgeone makers deploy
pnpm deploy:edgeone -- -n <project> --json   # 透传参数给 edgeone makers deploy
```

`scripts/deploy-edgeone.mjs` 的环境变量来源优先级：`--env-file=<path>` → `.edgeone/env.local`（推荐本地私密文件，已在 `.gitignore`）→ 已存在的根目录 `.env` → `edgeone makers env pull`。若最终仍拿不到非空 `.env`，脚本会**直接中止**而不是冒险部署。

构建产物：

- `admin/dist/`：管理后台静态资源（outputDirectory，由平台 CDN 直出）；
- `cloud-functions/api/[[default]].js`：esbuild 全量打包的云函数（接管 `/api/*`，零运行时外部依赖）；
- 根目录 `middleware.js`：边缘中间件，把非接口、无扩展名的页面导航改写到 `/index.html`（SPA history 兜底）。

## 部署后验证清单

- `GET /api/health` 返回 `{"ok":true,"data":{"status":"ok"}}`；
- 打开管理后台首页与各菜单路由，浏览器控制台无报错（SPA 兜底生效）；
- 使用 bootstrap 账号登录成功；
- 创建应用（`app_secret` 只展示一次）、批量生成激活码（明文只展示一次）；
- 客户端激活、校验、解绑接口正常；配了加密密钥时分销取码可用；
- 仪表盘数字与操作一致；日志列表可筛选。

## 与 Cloudflare 版本的语义差异

双驱动对齐了全部业务不变量（前置条件原子更新、唯一约束、软删除、授权期从首次激活计算等），仅存在以下实现级差异：

| 方面 | 说明 |
| --- | --- |
| 数据模型 | Blob 文档模型 + 版本化 CAS（乐观并发）替代 SQL；记录为事实源，索引陈旧由读路径自愈 |
| 自增 ID | 无自增列，由发号器按块分配；ID 唯一但不保证连续，跨批次顺序与写入顺序可能有细微交错 |
| 日志列表 | 未过滤查询的分页总数精确；带筛选的深分页最多扫描近 250 个小时分片，超出部分的 total 为近似值 |
| 仪表盘 | 统计由索引实时聚合；极端崩溃场景下索引可由记录自愈 |
| 事务 | 无跨记录事务；管理员批量操作（删除应用/租户、物理删码）改为幂等多步操作，部分失败重试即完成 |
| 容量 | Blob 免费额度约 1 GB（与 D1 免费额度量级相近，适合中小规模发码场景） |

> 应用密钥与设备指纹只存 HMAC 结果；激活码明文经 `CODE_PLAINTEXT_ENCRYPTION_KEY` 加密后入库（与 Cloudflare/D1 部署语义一致），Blob 上同样遵循该约定。
