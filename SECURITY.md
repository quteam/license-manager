# 安全政策

## 支持范围

当前仓库以 `main` 分支为主要维护版本。安全修复优先面向最新代码。

## 报告漏洞

请不要在公开 issue、讨论区或 PR 中披露未修复漏洞。

优先使用 GitHub Security Advisory 私下报告漏洞；如果当前仓库未开启该功能，请通过维护者公开提供的私有联系方式报告，并在标题中标明 `Security: license-manager`。

报告时请尽量包含：

- 受影响的接口、页面或模块。
- 复现步骤或最小 PoC。
- 可能影响的数据范围。
- 你认为可行的修复方向。

## 敏感信息

本项目不应提交真实生产配置。开源仓库中的 `worker/wrangler.toml` 只用于本地开发，生产配置应放在不提交的 `worker/wrangler.production.toml` 中。

如果真实密钥、生产 D1 ID、生产管理员密码或 `.dev.vars` 曾被提交，请立即：

1. 从历史记录中清理泄露内容。
2. 轮换所有相关 Wrangler secret。
3. 轮换生产管理员密码。
4. 检查 Cloudflare 账号、Worker、D1 和日志访问记录。

项目内部安全设计见 `docs/SECURITY.md`。
