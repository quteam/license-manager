# 前端规范

管理后台位于 `admin/`，使用 React、Vite、Tailwind CSS、Ant Design 和 Ant Design Pro Components。新增页面或调整交互时优先延续现有模式，不引入新的 UI 框架。

## 目录职责

- `admin/src/App.tsx`：顶层 `ConfigProvider`、Ant Design `App` 容器、登录态、当前管理员加载和登录/后台入口按需加载。
- `admin/src/components/Shell.tsx`：基于 `ProLayout` 混合布局的后台主布局、顶部品牌栏、侧边菜单、顶部用户菜单和页面切换。
- `admin/src/pages/TenantsPage.tsx`：超级管理员的租户列表、创建、编辑、状态、密码重设和删除操作。
- `admin/src/routes.tsx`：后台菜单、页面路径和页面组件配置，业务页面组件使用 `React.lazy` 按需加载。
- `admin/src/components/Login.tsx`：登录页。
- `admin/src/components/ChangePasswordModal.tsx`：修改密码弹窗。
- `admin/src/components/ResetPasswordModal.tsx`：登录页重设密码弹窗。
- `admin/src/pages/`：业务页面，每个页面一个文件。
- `admin/src/hooks/`：跨页面复用的前端数据加载逻辑。
- `admin/src/shared/`：前端展示工具、参数处理和通用类型。
- `admin/src/shared/CodeBlock.tsx`：带复制功能的代码展示组件，统一处理代码高亮。
- `admin/src/shared/constants.ts`：状态、动作、平台选项和 ProTable `valueEnum` 等前端枚举常量。
- `admin/src/api.ts`：API 请求封装、token 读写、查询参数处理。
- `admin/src/types.ts`：管理后台接口类型。
- `admin/src/styles.css`：Tailwind CSS 入口和少量全局基础层。

页面拆分规则：

- 面板首页放在 `admin/src/pages/DashboardPage.tsx`。
- 激活码页放在 `admin/src/pages/CodesPage.tsx`。
- 批量生成页放在 `admin/src/pages/GeneratePage.tsx`。
- 应用管理页放在 `admin/src/pages/AppsPage.tsx`。
- 操作日志页放在 `admin/src/pages/LogsPage.tsx`。
- 接入文档页放在 `admin/src/pages/DocsPage.tsx`。
- SDK 页放在 `admin/src/pages/SdkPage.tsx`。
- 在线 Playground 页放在 `admin/src/pages/PlaygroundPage.tsx`。

## 页面约定

- 页面级文件只放本页面的表格、表单、弹窗状态和请求逻辑。
- 跨页面复用逻辑优先放入 `hooks/` 或 `shared/`，不要复制到多个页面。
- 新增后台页面时，在 `routes.tsx` 中补充 `PageKey`、路由配置和页面组件。
- 后台路由由 `Shell` 根据 `routes.tsx` 统一管理，页面路径需同步到 `ProLayout` 的菜单配置，通过菜单切换同步浏览器地址；页面内容由 `Shell` 使用 `Suspense` 承载加载态。
- 面板首页为默认入口，路径为 `/dashboard`。
- 后台菜单采用 Ant Design Pro 混合布局和 group 侧边菜单，工作台为一级入口，“应用管理”“激活码”“生成激活码”归入“授权管理”，“操作日志”归入“审计管理”，“接入文档”“SDK”和“Playground”归入“开发支持”。
- 超级管理员额外看到“系统管理 / 租户管理”和顶部租户切换器；租户管理员不显示这些入口。
- 超级管理员切换租户后，现有业务页面重新挂载并通过 `admin/src/api.ts` 发送 `X-Tenant-Id`。租户管理员固定使用账号租户，前端选择值不参与其授权判断。
- 页面级 `PageContainer` 由 `Shell` 统一承载，除仪表盘外包含页面标题和面包屑；业务页面默认只渲染页面内容，不再重复包裹 `PageContainer`。
- 页面需要在标题后展示局部控件时，通过 `components/PageTitleExtraContext.tsx` 注册标题附加内容，并在页面卸载时清理，不在业务页面重复创建 `PageContainer`。
- 管理后台可见文案统一走 `admin/src/i18n/`，支持中文和英文；默认语言跟随系统语言，用户切换后写入浏览器本地存储。
- 登录页提供忘记密码入口，通过重设密码弹窗调用 `/api/recovery/admin-password`，请求体提交用户名、恢复密钥和新密码。
- 登录页依次要求租户名称或 slug、用户名和密码，三项均为必填；租户字段只随登录 JSON 请求体发送，不写入 URL。
- 日期展示保持 `YYYY-MM-DD HH:mm:ss` 风格，优先复用 `shared/format.tsx`。
- 应用管理页默认只展示应用列表；新增和修改应用使用弹窗承载表单，应用描述和授权码购买链接不必填，购买链接只接受 `http` 或 `https` 地址并在列表中提供外链入口；创建或更换后的 `app_secret` 使用一次性弹窗展示；应用使用说明用弹窗展示并提供可复制代码，代码中不得回显 `app_secret`；删除应用和更换密钥需二次确认。
- 租户管理页创建租户时同时收集初始管理员用户名和至少 8 位密码；支持修改名称/slug、启禁用、重设管理员密码，以及删除没有应用的非默认租户。
- 接入文档页提供客户端接口说明、接口流程图、可复制调用示例和现成 demo，demo 包含 TypeScript SDK、JavaScript SDK、cURL 和 HTML 示例；Playground 页提供在线真实接口调用，不保存或回显 `app_secret`，调用真实客户端接口时需要提示会写入日志或改变激活状态。
- SDK 页提供可复制、可下载的 React、Vue、React Native、Angular、Svelte、Electron、Flutter/Dart 和 TypeScript Core 组件代码，根据当前后台地址和所选应用自动填入 API 基础地址与 `app_id`，不得请求、保存或回显真实 `app_secret`。
- 管理后台列表默认展示序号列。
- 激活码页支持单个和批量禁用、启用、删除操作，并支持对已绑定的有效激活码手动解绑；禁用状态优先于未激活、已激活和已过期展示。
- 激活码页只展示设备绑定状态，不展示设备哈希或设备指纹明文。
- 操作日志页动作筛选需要覆盖后端已记录的操作类型，日志消息统一展示中文文案。

## UI 约定

- 表格优先使用 `ProTable`。
- 表单优先使用 `ProForm`、`ProFormText`、`ProFormSelect`、`ProFormDigit`、`ProFormTextArea`。
- 弹窗优先使用 Ant Design `Modal`。
- 状态展示优先使用 `Tag` 或 ProTable `valueEnum`。
- 操作反馈使用 Ant Design `message`。
- 确认类危险操作使用 `modal.confirm`，删除类操作需要 `danger` 样式。
- 操作按钮优先使用 Ant Design 图标，保持现有按钮文案和密度。
- 页面中展示代码、JSON、命令行或 HTML 示例时统一使用 `shared/CodeBlock.tsx`，并传入对应语言类型以保持高亮一致。
- 自定义页面布局、间距、尺寸、颜色和覆盖样式统一使用 Tailwind CSS utility class，避免新增普通 CSS 选择器。
- 不新增营销式页面、说明卡片或重复的页面标题描述。

## API 约定

- 所有接口调用走 `admin/src/api.ts` 的 `apiRequest`。
- 查询字符串使用 `toQuery` 生成。
- 接口返回类型同步维护在 `admin/src/types.ts`。
- 接口枚举值和表格展示枚举优先维护在 `admin/src/shared/constants.ts`，类型从常量派生。
- 涉及列表分页的页面使用后端返回的 `items` 和 `total`。
- 401 或会话失效时应清理 token 并回到登录态，相关逻辑统一走现有 token helper。

## 安全约定

- 前端不得展示应用密钥哈希、设备指纹明文或完整激活码历史。
- `app_secret` 和批量生成的明文激活码只在创建、更换或生成结果中一次性展示。
- 批量生成结果需要保留“明文激活码只在这里显示”的提示。
- 不把 token、密钥、激活码写入日志、URL 或可提交文件。

## 验证

前端改动至少运行：

```bash
pnpm --filter @license-manager/admin type-check
```

涉及构建、静态资源托管或部署路径时，额外运行：

```bash
pnpm --filter @license-manager/admin build
```
