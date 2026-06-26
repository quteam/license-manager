# API 规范

公共 API 前缀为 `/api`。

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
  "platform": "windows",
  "status": "active"
}
```

`description` 可省略或为空。

返回中包含一次性展示的 `app_secret`。

### 更新应用信息

`PATCH /api/admin/apps/:appId`

```json
{
  "name": "Desktop App",
  "description": "optional description",
  "platform": "windows"
}
```

`description` 可省略或为空，为空时清除描述。

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

返回的 `items` 中包含 `device_hash`，用于管理后台展示已绑定设备的 HMAC 哈希；未激活激活码为 `null`，接口不返回设备指纹明文。

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
