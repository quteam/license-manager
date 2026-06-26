# 文档索引

本目录按主题维护项目文档。编码 Agent 入口规范在根目录 `AGENTS.md`，本目录只保存项目主题文档。

## 使用方式

- Agent 先读根目录 `AGENTS.md`。
- 再按任务类型读取本目录下的相关主题文档。
- 修改规则时优先更新对应主题文档，避免在多个文件里复制同一段约束。

## 文档职责

- `DEVELOPMENT.md`：本地环境、常用命令、测试和开发流程。
- `ARCHITECTURE.md`：项目结构、模块职责和请求流。
- `BUSINESS_RULES.md`：产品边界、激活码状态、过期和解绑迁移规则。
- `FRONTEND.md`：管理后台目录、页面拆分、UI、API 和前端安全约定。
- `API.md`：接口列表、请求示例、响应格式和分页规范。
- `SECURITY.md`：密钥、HMAC、JWT、日志和敏感数据处理。
- `DATABASE.md`：D1 表职责、状态字段、迁移和索引约束。
- `DEPLOYMENT.md`：Cloudflare、D1、Wrangler secret 和发布步骤。

根目录还有面向开源协作的通用入口：

- `README.md`：英文默认项目介绍、快速开始、部署入口和开源说明。
- `README.zh-CN.md`：中文项目介绍、快速开始、部署入口和开源说明。
- `CONTRIBUTING.md`：贡献流程、本地开发、提交前检查和安全提交要求。
- `SECURITY.md`：漏洞私下报告方式和泄露后处理建议。
- `LICENSE`：项目开源许可证。

## 维护原则

- 业务规则只在 `BUSINESS_RULES.md` 维护。
- 前端结构和 UI 约定只在 `FRONTEND.md` 维护。
- 接口细节只在 `API.md` 维护。
- 数据库结构说明只在 `DATABASE.md` 维护。
- 安全要求只在 `SECURITY.md` 维护。
- 根目录 README 保留项目介绍、快速开始、部署入口和开源说明，英文为默认版本，中文放在 `README.zh-CN.md`。
- `AGENTS.md` 维护 Agent 入口规范和任务路由。
