# 贡献指南

感谢关注本项目。提交变更前请先确认影响范围，并保持改动集中。

## 开发环境

- Node.js `>=20.11.0`
- pnpm `>=11.7.0`
- Cloudflare Wrangler 由 `worker/package.json` 管理

初始化：

```bash
pnpm install
cp worker/.dev.vars.example worker/.dev.vars
pnpm db:migrate:local
pnpm dev
```

开发后台访问 `http://localhost:5173`，Worker 默认运行在 `http://localhost:8787`。

## 提交前检查

按改动范围运行验证：

```bash
pnpm type-check
pnpm test
pnpm build
```

仅修改文档时可以不运行测试，但请在提交说明或 PR 说明中写明原因。

## 代码约定

- 后端业务规则放在 `worker/src/service.ts`。
- SQL 访问放在 `worker/src/repository.ts`，必须使用 prepared statement 和 `.bind(...)`。
- 前端接口调用统一走 `admin/src/api.ts`。
- 新增前端页面放在 `admin/src/pages/`，并在 `admin/src/components/Shell.tsx` 接入。
- 接口返回字段变化时，同步更新后端类型、前端类型、调用方和文档。
- 数据库 schema 变化必须新增 `migrations/` 文件，不修改已发布迁移表达线上变更。

更详细的开发规范见 `AGENTS.md` 和 `docs/README.md`。

## 安全要求

不要提交以下内容：

- `worker/.dev.vars`
- `worker/wrangler.production.toml`
- 真实密钥、生产账号密码、JWT、HMAC secret
- 生产 D1 `database_id`
- Wrangler 本地状态、构建产物、日志

公开仓库只应包含 `worker/wrangler.toml` 的本地占位配置和 `worker/wrangler.production.example.toml` 的生产配置模板。

## 漏洞报告

请不要通过公开 issue 披露安全漏洞。报告方式见根目录 `SECURITY.md`。
