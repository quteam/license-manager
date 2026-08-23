# 版本控制 API 规范

版本控制功能为每个应用维护一组版本记录，支持管理后台创建/发布/下架/删除版本、标记强制更新，以及客户端查询最新版本。

公共前缀、统一响应 envelope、鉴权边界等通用约定与 [API.md](API.md) 一致，本文只描述版本控制相关接口。

## 数据模型

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer | 版本记录 ID |
| `app_id` | integer | 关联的 `apps.id` |
| `app_public_id` | string | 应用公开 `app_id` |
| `app_name` | string | 应用名称 |
| `version` | string | 展示版本号，如 `1.2.0` |
| `version_code` | integer | 比较用版本代码，同一应用内未删除记录唯一（如 `1.2.0` 填 `120`） |
| `release_notes` | string | 更新说明（Markdown 文本，按原样返回） |
| `download_url` | string | 下载地址，可为空字符串 |
| `is_forced` | integer | `1` 表示强制更新，`0` 表示可选更新 |
| `status` | enum | `draft` / `published` / `archived` |
| `published_at` | string \| null | 发布时间（UTC ISO 8601） |
| `created_by` | integer \| null | 创建管理员 ID |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

状态流转：`draft` →（发布）→ `published` →（下架）→ `draft`；删除为软删除，客户端不可见。

## 鉴权边界

| 接口范围 | 鉴权 |
| --- | --- |
| `/api/admin/versions*` | `Authorization: Bearer <token>` + 租户上下文（与应用/激活码接口一致） |
| `/api/client/versions/latest` | 请求体提供 `app_id` 和 `app_secret` |

## 管理端接口

### 版本列表

`GET /api/admin/versions?app_id=&status=&page=&page_size=`

- `app_id`：可选，按应用公开 ID 筛选
- `status`：可选，`draft` / `published` / `archived`
- `page`：默认 1；`page_size`：默认 20，最大 100

响应 `data`：

```json
{
  "items": [{ "id": 1, "app_id": 3, "app_public_id": "app_xxx", "app_name": "我的软件", "version": "1.2.0", "version_code": 120, "release_notes": "…", "download_url": "…", "is_forced": 0, "status": "draft", "published_at": null, "created_by": 1, "created_at": "…", "updated_at": "…" }],
  "total": 1
}
```

### 创建版本

`POST /api/admin/versions`

请求体：

```json
{
  "app_id": "app_xxx",
  "version": "1.2.0",
  "version_code": 120,
  "release_notes": "新增版本控制功能",
  "download_url": "https://example.com/app-1.2.0.zip",
  "is_forced": false
}
```

- 创建后状态为 `draft`，客户端不可见。
- 同一应用内 `version_code` 重复返回 `409 VERSION_CODE_CONFLICT`。
- 成功返回 `201`，`data.version` 为版本对象。

### 修改版本

`PATCH /api/admin/versions/:id`

请求体为可选字段（不传则保持原值）：`version`、`version_code`、`release_notes`、`download_url`、`is_forced`。

- `version_code` 若发生变更且与同应用其他未删除版本冲突，返回 `409 VERSION_CODE_CONFLICT`。
- 版本不存在或不属于当前租户返回 `404 VERSION_NOT_FOUND`。

### 发布版本

`POST /api/admin/versions/:id/publish`

- 仅 `draft` 可发布；发布后 `status = published` 并记录 `published_at`，客户端立即可见。
- 非 `draft` 发布返回 `400 VERSION_NOT_PUBLISHABLE`。

### 下架版本

`POST /api/admin/versions/:id/unpublish`

- 仅 `published` 可下架；下架后回到 `draft`，客户端不再可见。
- 非 `published` 下架返回 `400 VERSION_NOT_PUBLISHABLE`。

### 删除版本

`DELETE /api/admin/versions/:id`

- 软删除，历史记录保留，客户端不再可见。
- 返回 `{ "deleted": true }`。

## 客户端接口

### 查询最新版本

`POST /api/client/versions/latest`

请求体：

```json
{
  "app_id": "app_xxx",
  "app_secret": "sec_xxx",
  "current_version_code": 100
}
```

- `current_version_code`：可选，客户端当前版本代码；传入后才计算 `update_required`。

响应 `data`：

```json
{
  "latest": {
    "version": "1.2.0",
    "version_code": 120,
    "release_notes": "新增版本控制功能",
    "download_url": "https://example.com/app-1.2.0.zip",
    "is_forced": true,
    "published_at": "2026-08-24T00:00:00.000Z"
  },
  "update_required": true
}
```

- 无已发布版本时 `latest` 为 `null`，`update_required` 为 `false`。
- `update_required` 仅在传入 `current_version_code` 且其小于最新 `version_code` 时为 `true`。

### 应用信息（增强）

`POST /api/client/app-info`

原字段保持不变，新增 `latest_version`（最新已发布版本对象或 `null`），客户端可零改动获取版本信息。

## 客户端接入示例

```bash
curl -X POST https://your-domain.example.com/api/client/versions/latest \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "app_xxx",
    "app_secret": "sec_xxx",
    "current_version_code": 100
  }'
```

客户端处理建议：

1. 启动或定时调用 `/api/client/versions/latest`（也可复用 `/api/client/app-info` 的 `latest_version`）。
2. 若 `latest` 为 `null` 或 `latest.version_code <= current_version_code`，无需更新。
3. 若 `update_required` 为 `true` 且 `is_forced` 为 `true`，应阻止继续使用并引导下载 `download_url`。
4. 若 `update_required` 为 `true` 且 `is_forced` 为 `false`，提示用户可更新。
5. `release_notes` 为 Markdown 文本，客户端可按需渲染。

## 错误码

| 错误码 | HTTP | 场景 |
| --- | --- | --- |
| `VERSION_NOT_FOUND` | 404 | 版本不存在或不属于当前租户 |
| `VERSION_CODE_CONFLICT` | 409 | 同一应用内版本代码重复 |
| `VERSION_NOT_PUBLISHABLE` | 400 | 状态流转非法（非草稿发布 / 非已发布下架） |
