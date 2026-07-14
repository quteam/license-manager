# API 规范

公共 API 前缀为 `/api`。

本文描述对管理后台和客户端可观察的 HTTP 契约。示例若只展示业务对象，默认表示成功响应中的 `data`；完整响应始终使用统一 envelope。

## 通用约定

- 请求和响应使用 JSON；有请求体的接口发送 `Content-Type: application/json`。
- 字段名使用 `snake_case`，URL 路径参数使用当前已有的 `:appId`、`:id` 形式。
- 未声明的请求字段不应被依赖；新增字段必须明确必填、可选、空值和默认行为。
- 时间字段使用 UTC ISO 8601 字符串。
- 业务失败返回稳定 `error.code`；调用方不得依赖 `error.message` 做程序判断。
- API 不返回激活码 HMAC、应用密钥 HMAC、密码哈希、密码 salt 或设备指纹明文。

## 鉴权边界

| 接口范围 | 鉴权 |
| --- | --- |
| `GET /api/health` | 无 |
| `POST /api/admin/login` | 用户名和密码 |
| `POST /api/recovery/admin-password` | bootstrap 用户名和恢复密钥，请求体传递 |
| `/api/admin/*` 其他接口 | `Authorization: Bearer <token>` |
| `/api/client/*` | 每个请求体同时提供 `app_id` 和 `app_secret` |

客户端鉴权依次确认应用存在、应用启用、密钥匹配。通过应用鉴权不代表激活码有效，仍需执行激活码状态判断。

## 响应格式

成功：

```json
{
  "ok": true,
  "data": {}
}
```

失败：

```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid JSON body"
  }
}
```

错误码常量定义在 `worker/src/constants.ts`，接口类型从 `worker/src/types.ts` 导出：

- `BAD_REQUEST`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `APP_DISABLED`
- `INVALID_APP_SECRET`
- `INVALID_CODE`
- `CODE_DISABLED`
- `CODE_DELETED`
- `CODE_EXPIRED`
- `DEVICE_MISMATCH`
- `REBINDS_EXCEEDED`
- `REBINDS_TOO_FREQUENT`
- `CONFLICT`

常见 HTTP 状态语义：

| HTTP | 使用场景 |
| --- | --- |
| `400` | JSON、类型、范围或当前操作前置条件无效 |
| `401` | 管理员凭证、Bearer Token 或应用密钥无效 |
| `403` | 资源存在但被禁用、过期、设备不匹配或超过业务限制 |
| `404` | 路由、应用、管理员或目标资源不存在；无效激活码使用 `INVALID_CODE` |
| `409` | 并发状态变化、唯一性冲突或资源存在引用 |
| `410` | 激活码已软删除 |
| `429` | 自助解绑仍在冷却期 |
| `500` | 未预期内部异常，对外统一为 `CONFLICT`，不暴露内部细节 |

## 接口总览

| 方法与路径 | 用途 | 主要影响 |
| --- | --- | --- |
| `GET /api/health` | 健康检查 | 只读 |
| `POST /api/admin/login` | 管理员登录 | 可能初始化 bootstrap 管理员 |
| `POST /api/recovery/admin-password` | 恢复管理员密码 | 更新密码哈希与 salt |
| `GET /api/admin/me` | 当前管理员 | 只读 |
| `PATCH /api/admin/password` | 修改密码 | 更新密码哈希与 salt |
| `GET /api/admin/dashboard` | 仪表盘统计 | 只读聚合 |
| `GET /api/admin/plans` | 套餐列表 | 只读 |
| `GET /api/admin/apps` | 应用列表 | 只读 |
| `POST /api/admin/apps` | 创建应用 | 写应用，一次性返回密钥 |
| `PATCH /api/admin/apps/:appId` | 修改应用信息 | 写应用 |
| `PATCH /api/admin/apps/:appId/status` | 启用/禁用应用 | 写应用和日志 |
| `PATCH /api/admin/apps/:appId/secret` | 更换应用密钥 | 写应用和日志，一次性返回密钥 |
| `DELETE /api/admin/apps/:appId` | 删除无引用应用 | 物理删除应用 |
| `POST /api/admin/codes/batch` | 批量生成激活码 | 写批次、激活码和日志 |
| `GET /api/admin/codes` | 激活码列表 | 只读分页 |
| `PATCH /api/admin/codes/:id/status` | 启用/禁用激活码 | 写激活码和日志 |
| `PATCH /api/admin/codes/:id/unbind-device` | 管理员手动解绑 | 写激活码和日志 |
| `POST /api/admin/codes/bulk` | 批量删除/启用/禁用 | 写激活码和日志 |
| `DELETE /api/admin/codes/:id` | 软删除激活码 | 写激活码和日志 |
| `GET /api/admin/logs` | 操作日志 | 只读分页 |
| `POST /api/client/app-info` | 获取应用公开信息 | 只读 |
| `POST /api/client/activate` | 首次激活或重绑 | 可能写激活码和日志 |
| `POST /api/client/verify` | 校验授权 | 写审计日志 |
| `POST /api/client/unbind-device` | 自助解绑迁移 | 写激活码和日志 |

## 分页规范

- `page` 从 1 开始。
- `page_size` 默认 20。
- `page_size` 最大 100。
- 返回 `items` 和 `total`。

## 管理端接口

管理端接口除登录外都需要 `Authorization: Bearer <token>`。

### 登录

`POST /api/admin/login`

```json
{
  "username": "admin",
  "password": "password"
}
```

返回：

```json
{
  "token": "jwt",
  "admin": {
    "id": 1,
    "username": "admin"
  }
}
```

### 当前管理员

`GET /api/admin/me`

返回：

```json
{
  "admin": {
    "id": 1,
    "username": "admin"
  }
}
```

### 修改密码

`PATCH /api/admin/password`

```json
{
  "current_password": "old-password",
  "new_password": "new-password"
}
```

### 重设管理员密码

`POST /api/recovery/admin-password`

该接口用于无法登录时重设 bootstrap 管理员密码，不属于 `/api/admin/*`，但必须提供生产环境中配置的 `ADMIN_BOOTSTRAP_PASSWORD` 作为恢复密钥。

```json
{
  "username": "admin",
  "recovery_password": "bootstrap-secret",
  "new_password": "new-password"
}
```

约束：

- `username` 必须匹配 `ADMIN_BOOTSTRAP_USERNAME`。
- `recovery_password` 必须匹配 `ADMIN_BOOTSTRAP_PASSWORD`。
- `new_password` 至少 8 位，且不能与恢复密钥相同。

### 面板统计

`GET /api/admin/dashboard`

返回管理后台首页聚合数据：

```json
{
  "overview": {
    "apps_total": 2,
    "apps_active": 1,
    "codes_total": 100,
    "codes_unused": 30,
    "codes_active": 55,
    "codes_disabled": 5,
    "codes_expired": 8,
    "codes_deleted": 2,
    "logs_today": 20,
    "client_failures_today": 3
  },
  "code_status": [{ "status": "active", "count": 55 }],
  "app_code_ranking": [
    {
      "app_id": "app_xxx",
      "app_name": "Desktop App",
      "platform": "windows",
      "total": 80,
      "active": 50,
      "unused": 20,
      "disabled": 3,
      "expired": 5,
      "deleted": 2
    }
  ],
  "plan_distribution": [{ "plan_code": "monthly", "plan_name": "月卡", "count": 60 }],
  "log_trend": [{ "date": "2026-06-22", "success": 18, "failure": 2 }],
  "code_trend": [{ "date": "2026-06-22", "activated": 12, "expired": 3, "active": 55 }]
}
```

统计口径：

- `codes_active` 排除已禁用、已删除和已过期激活码。
- `codes_disabled` 包含非删除且 `disabled_at IS NOT NULL` 的激活码。
- `codes_expired` 为已激活、未禁用且 `expires_at <= now` 的激活码。
- `client_failures_today` 只统计今日客户端激活、校验、解绑失败日志。
- `code_trend` 为最近 7 天激活码走势；`activated` 按 `activated_at` 当天统计，`expired` 按 `expires_at` 当天统计，`active` 为当天结束时仍处于使用中的激活码数量。

### 套餐列表

`GET /api/admin/plans`

### 应用列表

`GET /api/admin/apps`

### 创建应用

`POST /api/admin/apps`

```json
{
  "name": "Desktop App",
  "description": "optional description",
  "purchase_url": "https://example.com/buy-license",
  "platform": "windows",
  "status": "active"
}
```

`description` 可省略或为空。

`purchase_url` 可省略或为空，只接受 `http` 或 `https` 链接。

返回中包含一次性展示的 `app_secret`。

### 更新应用信息

`PATCH /api/admin/apps/:appId`

```json
{
  "name": "Desktop App",
  "description": "optional description",
  "purchase_url": "https://example.com/buy-license",
  "platform": "windows"
}
```

`description` 可省略或为空，为空时清除描述。

`purchase_url` 可省略或为空，为空时清除购买链接；只接受 `http` 或 `https` 链接。

返回更新后的 `app`，不包含 `app_secret` 或密钥哈希。

### 更新应用状态

`PATCH /api/admin/apps/:appId/status`

```json
{
  "status": "disabled"
}
```

`status` 只能是 `active` 或 `disabled`。

### 更换应用密钥

`PATCH /api/admin/apps/:appId/secret`

生成新的 `app_secret`，旧密钥立即失效。

返回中包含一次性展示的新 `app_secret`，不包含密钥哈希。

### 删除应用

`DELETE /api/admin/apps/:appId`

仅无激活码、生成批次或操作日志引用的应用可删除。已有授权数据的应用返回 `CONFLICT`。

### 生成激活码

`POST /api/admin/codes/batch`

```json
{
  "app_id": "app_xxx",
  "plan_code": "monthly",
  "quantity": 10,
  "note": "optional note"
}
```

约束：

- `quantity` 范围为 1 到 300。
- 返回的 `codes` 是明文激活码，只在本次响应中出现。

### 激活码列表

`GET /api/admin/codes`

查询参数：

- `page`
- `page_size`
- `query`
- `app_id`
- `plan_code`
- `status`

`status` 支持：

- `unused`
- `active`
- `disabled`
- `deleted`
- `expired`

筛选语义：

- `disabled`：未删除且 `disabled_at` 非空。
- `expired`：`status = active`、未禁用且 `expires_at <= now`。
- `unused`：存储状态为 `unused` 且未禁用。
- `active`：存储状态为 `active` 且未禁用；当前实现仍可能包含已过期行，调用方根据 `expires_at` 展示 `expired`。
- `deleted`：存储状态为 `deleted`。

返回的 `items` 中包含 `device_hash`，仅用于管理后台判断是否已绑定设备；UI 不展示原始哈希。未激活激活码为 `null`，接口不返回设备指纹明文。

### 更新激活码禁用状态

`PATCH /api/admin/codes/:id/status`

```json
{
  "status": "disabled"
}
```

`status` 只能是 `disabled` 或 `enabled`。启用后恢复激活码原有的未激活或已激活状态；已删除激活码不能启用。

### 删除激活码

`DELETE /api/admin/codes/:id`

删除为软删除。

### 手动解绑设备

`PATCH /api/admin/codes/:id/unbind-device`

管理员手动解除激活码当前设备绑定。仅已激活、未禁用、未删除、未过期且已绑定设备的激活码可以手动解绑。手动解绑不会增加 `rebind_count`，也不会更新 `last_rebind_at`；解绑后用户可在新设备使用同一激活码重新激活绑定，授权有效期不重新计算。

### 批量操作激活码

`POST /api/admin/codes/bulk`

```json
{
  "action": "delete",
  "ids": [1, 2, 3]
}
```

`action` 支持：

- `delete`：批量软删除。
- `disable`：批量禁用。
- `enable`：批量启用。

约束：

- `ids` 数量范围为 1 到 100。
- 删除为软删除。
- 已删除激活码不能启用或禁用。
- 返回 `requested` 和实际更新数量 `updated`。

### 操作日志

`GET /api/admin/logs`

查询参数：

- `page`
- `page_size`
- `query`
- `app_id`
- `action`

`action` 常见值：

- `batch_generate`：批量生成
- `activate`：激活
- `verify`：校验
- `unbind_device`：解绑
- `manual_unbind_device`：手动解绑
- `delete_code`：删除激活码
- `disable_code`：禁用激活码
- `enable_code`：启用激活码
- `disable_app`：禁用应用
- `enable_app`：启用应用
- `rotate_app_secret`：更换应用密钥

## 客户端接口

客户端请求中的 `app_secret`、`code` 和 `device_fingerprint` 只能放在 JSON 请求体中，不得放入 URL、查询参数或日志。

### 获取应用信息

`POST /api/client/app-info`

```json
{
  "app_id": "app_xxx",
  "app_secret": "sec_xxx"
}
```

请求会校验应用是否存在、处于启用状态且密钥匹配。成功时 `data` 只包含应用公开信息，不包含内部数据库 ID、应用密钥或密钥哈希：

```json
{
  "ok": true,
  "data": {
    "app_id": "app_xxx",
    "name": "Desktop App",
    "description": "optional description",
    "purchase_url": "https://example.com/buy-license",
    "platform": "windows",
    "status": "active"
  }
}
```

### 激活

`POST /api/client/activate`

```json
{
  "app_id": "app_xxx",
  "app_secret": "sec_xxx",
  "code": "LM-XXXXX-XXXXX-XXXXX-XXXXX",
  "device_fingerprint": "stable-device-id"
}
```

激活、校验和解绑成功时返回授权信息。`device_bound` 表示当前激活码是否已绑定设备；解绑成功后该字段为 `false`，新设备重新激活后恢复为 `true`。

授权信息 `data` 结构：

```json
{
  "valid": true,
  "device_bound": true,
  "app_id": "app_xxx",
  "plan": {
    "code": "monthly",
    "name": "月卡",
    "duration_days": 30
  },
  "activated_at": "2026-07-14T08:00:00.000Z",
  "expires_at": "2026-08-14T08:00:00.000Z",
  "remaining_seconds": 2678400,
  "rebind_count": 0,
  "max_rebinds": 3
}
```

- `valid` 在成功响应中固定为 `true`；无效授权通过失败 envelope 表达，不返回 `valid: false` 的成功响应。
- `remaining_seconds` 向下取整且最小为 0，仅代表响应时刻的剩余时间。
- `duration_days` 是套餐基础字段；月卡、季卡和年卡的实际 `expires_at` 按自然月/年计算。
- `device_bound` 为 `false` 时授权仍保留原到期时间，但校验会失败，必须先重新激活绑定。

### 校验

`POST /api/client/verify`

```json
{
  "app_id": "app_xxx",
  "app_secret": "sec_xxx",
  "code": "LM-XXXXX-XXXXX-XXXXX-XXXXX",
  "device_fingerprint": "stable-device-id"
}
```

### 解绑

`POST /api/client/unbind-device`

```json
{
  "app_id": "app_xxx",
  "app_secret": "sec_xxx",
  "code": "LM-XXXXX-XXXXX-XXXXX-XXXXX",
  "device_fingerprint": "stable-device-id"
}
```

解绑成功后激活码保留原 `activated_at` 和 `expires_at`，但清空绑定设备。新设备继续调用激活接口并传入新设备的 `device_fingerprint` 完成重新绑定，不会重新计算授权有效期。

## 契约变更要求

- 新增或修改路由时同步 `worker/src/routes.ts` 和本文件。
- 新增错误码时同步 `worker/src/constants.ts`、前端常量/处理、测试和本文件。
- 响应字段变化时同步 Worker 返回类型、`admin/src/types.ts`、所有调用方和示例。
- 持久化字段变化还需新增 migration，并更新 `worker/src/repository.ts`、`types.ts` 和 `docs/DATABASE.md`。
- 客户端行为变化必须同步 `docs/BUSINESS_RULES.md`，并覆盖成功、拒绝和并发冲突测试。
- 删除或重命名字段属于破坏性变化；在没有明确版本迁移方案前，不得直接修改已公开客户端契约。
