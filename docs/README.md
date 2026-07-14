# 文档索引

本目录保存项目当前规范。根目录 `AGENTS.md` 是编码 Agent 的入口和执行清单；本目录回答架构、业务、接口、数据、安全、前端、开发和部署各主题的具体规则。

## 阅读原则

1. 先读根目录 `AGENTS.md`，按任务路由选择文档。
2. 只读取与变更相关的主题文档，再对照该主题的代码事实源。
3. 主题文档描述预期契约，代码和迁移描述当前实现；两者冲突时必须显式消除差异。
4. 修改行为时同步修改对应主题文档，不在提交说明、历史方案或代码注释里另建一套规范。

## 文档职责

| 文档 | 回答的问题 | 不负责的内容 |
| --- | --- | --- |
| `ARCHITECTURE.md` | 系统如何分层、模块如何依赖、一次请求如何流转 | 具体业务条件和完整接口字段 |
| `BUSINESS_RULES.md` | 产品范围、领域术语、状态语义、激活/校验/解绑规则 | HTTP 参数和 SQL 实现 |
| `API.md` | 路径、鉴权、请求响应、分页、错误码 | 页面布局和数据库索引 |
| `DATABASE.md` | 表关系、字段不变量、派生状态、迁移和 SQL 规则 | 产品交互和部署步骤 |
| `SECURITY.md` | 敏感数据、密钥、鉴权、日志和生产安全边界 | 一般业务流程 |
| `FRONTEND.md` | 页面结构、路由、组件、UI、i18n 和前端安全 | Worker 业务实现 |
| `DEVELOPMENT.md` | 环境、命令、测试策略和开发闭环 | 生产发布操作 |
| `DEPLOYMENT.md` | Cloudflare、D1、Wrangler secret 和发布检查 | 日常编码规范 |

根目录通用文档：

- `README.md`：英文默认项目介绍、快速开始和部署入口。
- `README.zh-CN.md`：中文项目介绍、快速开始和部署入口。
- `CONTRIBUTING.md`：面向外部贡献者的协作流程。
- `SECURITY.md`：漏洞私下报告方式和泄露后处理建议。
- `LICENSE`：开源许可证。


## 推荐阅读组合

| 任务 | 文档组合 |
| --- | --- |
| 修改激活、校验或换机行为 | `BUSINESS_RULES.md` + `API.md`；涉及持久化时加 `DATABASE.md`，涉及密钥时加 `SECURITY.md` |
| 新增管理后台功能 | `FRONTEND.md` + `API.md`；新增业务规则时加 `BUSINESS_RULES.md` |
| 新增字段 | `DATABASE.md` + `API.md`；后台展示时加 `FRONTEND.md` |
| 修改登录、JWT、HMAC 或恢复密码 | `SECURITY.md` + `API.md` + `BUSINESS_RULES.md` |
| 调整构建或发布 | `DEVELOPMENT.md` + `DEPLOYMENT.md` + `ARCHITECTURE.md` |
| 只修改文档结构 | 本文件 + `AGENTS.md`；影响开源入口时再读根目录 README/贡献文档 |

## 事实源映射

| 事实 | 规范来源 | 实现来源 |
| --- | --- | --- |
| 产品和业务语义 | `BUSINESS_RULES.md` | `worker/src/service.ts`、`worker/test/service.test.ts` |
| HTTP 契约 | `API.md` | `worker/src/routes.ts`、`http.ts`、`constants.ts` |
| 数据结构 | `DATABASE.md` | `migrations/`、`repository.ts`、`types.ts` |
| 前端页面与路由 | `FRONTEND.md` | `admin/src/routes.tsx`、`pages/`、`components/` |
| 安全边界 | `SECURITY.md` | `config.ts`、`crypto.ts`、`middleware.ts`、相关测试 |
| 命令和环境 | `DEVELOPMENT.md` / `DEPLOYMENT.md` | `package.json`、Wrangler 配置、`scripts/` |

## 写作规范

- 使用可验证的陈述，写清条件、动作、结果和例外，避免“合理处理”“按需支持”等模糊表述。
- 业务规则优先使用不变量、状态表和决策表；API 使用字段和错误契约；数据库使用字段约束和迁移规则。
- `必须` 表示不可违反的约束，`应` 表示默认做法，`可以` 表示允许但非必需。
- 示例不得包含真实密钥、生产域名、生产数据库 ID 或可用激活码。
- 路径、命令、枚举和字段名使用代码格式，并与仓库当前名称完全一致。
- 不复制同一规则。需要跨文档引用时，保留一句摘要并链接到权威主题文档。

## 变更与审查

文档变更至少检查：

- 新规则是否有唯一归档位置。
- 文档中的路径、脚本、接口、枚举和字段是否仍存在。
- 业务规则、API、数据库、前端类型和测试是否一致。
- 历史方案是否被误当成当前行为。
- README 或贡献入口是否需要同步。

发现过时文档时，应在当前任务范围内直接修正；若冲突会改变产品行为，则先明确预期，再同时更新实现、测试和规范。
