export const APP_STATUS = {
  ACTIVE: "active",
  DISABLED: "disabled"
} as const;

export const APP_STATUS_VALUES = [APP_STATUS.ACTIVE, APP_STATUS.DISABLED] as const;
export type AppStatus = (typeof APP_STATUS_VALUES)[number];

export const APP_STATUS_VALUE_ENUM = {
  [APP_STATUS.ACTIVE]: { text: "启用", status: "Success" },
  [APP_STATUS.DISABLED]: { text: "禁用", status: "Warning" }
} as const;

export const CODE_STATUS = {
  UNUSED: "unused",
  ACTIVE: "active",
  DELETED: "deleted"
} as const;

export const CODE_STATUS_VALUES = [CODE_STATUS.UNUSED, CODE_STATUS.ACTIVE, CODE_STATUS.DELETED] as const;
export type CodeStatus = (typeof CODE_STATUS_VALUES)[number];

export const CODE_DERIVED_STATUS = {
  DISABLED: "disabled",
  EXPIRED: "expired"
} as const;

export const CODE_LIST_STATUS_VALUES = [
  CODE_STATUS.UNUSED,
  CODE_STATUS.ACTIVE,
  CODE_DERIVED_STATUS.DISABLED,
  CODE_DERIVED_STATUS.EXPIRED,
  CODE_STATUS.DELETED
] as const;
export type CodeListStatus = (typeof CODE_LIST_STATUS_VALUES)[number];

export const CODE_LIST_STATUS_VALUE_ENUM = {
  [CODE_STATUS.UNUSED]: { text: "未激活" },
  [CODE_STATUS.ACTIVE]: { text: "已激活" },
  [CODE_DERIVED_STATUS.DISABLED]: { text: "已禁用" },
  [CODE_DERIVED_STATUS.EXPIRED]: { text: "已过期" },
  [CODE_STATUS.DELETED]: { text: "已删除" }
} as const;

export const CODE_TOGGLE_STATUS = {
  ENABLED: "enabled",
  DISABLED: "disabled"
} as const;

export const CODE_TOGGLE_STATUS_VALUES = [CODE_TOGGLE_STATUS.ENABLED, CODE_TOGGLE_STATUS.DISABLED] as const;
export type CodeToggleStatus = (typeof CODE_TOGGLE_STATUS_VALUES)[number];

export const CODE_BULK_ACTION = {
  DELETE: "delete",
  ENABLE: "enable",
  DISABLE: "disable"
} as const;

export const CODE_BULK_ACTION_VALUES = [
  CODE_BULK_ACTION.DELETE,
  CODE_BULK_ACTION.ENABLE,
  CODE_BULK_ACTION.DISABLE
] as const;
export type CodeBulkAction = (typeof CODE_BULK_ACTION_VALUES)[number];

export const LOG_ACTION = {
  BATCH_GENERATE: "batch_generate",
  ACTIVATE: "activate",
  VERIFY: "verify",
  UNBIND_DEVICE: "unbind_device",
  MANUAL_UNBIND_DEVICE: "manual_unbind_device",
  DELETE_CODE: "delete_code",
  DISABLE_CODE: "disable_code",
  ENABLE_CODE: "enable_code",
  DISABLE_APP: "disable_app",
  ENABLE_APP: "enable_app",
  ROTATE_APP_SECRET: "rotate_app_secret"
} as const;

export const LOG_ACTION_VALUE_ENUM = {
  [LOG_ACTION.BATCH_GENERATE]: { text: "批量生成" },
  [LOG_ACTION.ACTIVATE]: { text: "激活" },
  [LOG_ACTION.VERIFY]: { text: "校验" },
  [LOG_ACTION.UNBIND_DEVICE]: { text: "解绑" },
  [LOG_ACTION.MANUAL_UNBIND_DEVICE]: { text: "手动解绑" },
  [LOG_ACTION.DELETE_CODE]: { text: "删除激活码" },
  [LOG_ACTION.DISABLE_CODE]: { text: "禁用激活码" },
  [LOG_ACTION.ENABLE_CODE]: { text: "启用激活码" },
  [LOG_ACTION.DISABLE_APP]: { text: "禁用应用" },
  [LOG_ACTION.ENABLE_APP]: { text: "启用应用" },
  [LOG_ACTION.ROTATE_APP_SECRET]: { text: "更换应用密钥" }
} as const;

export type LogAction = keyof typeof LOG_ACTION_VALUE_ENUM;

export const LOG_RESULT = {
  SUCCESS: "success",
  FAILURE: "failure"
} as const;

export const LOG_RESULT_VALUES = [LOG_RESULT.SUCCESS, LOG_RESULT.FAILURE] as const;
export type LogResult = (typeof LOG_RESULT_VALUES)[number];

export const MAX_CODE_BATCH_QUANTITY = 300;

export const ERROR_CODE = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  APP_DISABLED: "APP_DISABLED",
  INVALID_APP_SECRET: "INVALID_APP_SECRET",
  INVALID_CODE: "INVALID_CODE",
  CODE_DISABLED: "CODE_DISABLED",
  CODE_DELETED: "CODE_DELETED",
  CODE_EXPIRED: "CODE_EXPIRED",
  DEVICE_MISMATCH: "DEVICE_MISMATCH",
  REBINDS_EXCEEDED: "REBINDS_EXCEEDED",
  REBINDS_TOO_FREQUENT: "REBINDS_TOO_FREQUENT",
  CONFLICT: "CONFLICT"
} as const;

export const ERROR_CODE_VALUES = [
  ERROR_CODE.BAD_REQUEST,
  ERROR_CODE.UNAUTHORIZED,
  ERROR_CODE.FORBIDDEN,
  ERROR_CODE.NOT_FOUND,
  ERROR_CODE.APP_DISABLED,
  ERROR_CODE.INVALID_APP_SECRET,
  ERROR_CODE.INVALID_CODE,
  ERROR_CODE.CODE_DISABLED,
  ERROR_CODE.CODE_DELETED,
  ERROR_CODE.CODE_EXPIRED,
  ERROR_CODE.DEVICE_MISMATCH,
  ERROR_CODE.REBINDS_EXCEEDED,
  ERROR_CODE.REBINDS_TOO_FREQUENT,
  ERROR_CODE.CONFLICT
] as const;
export type ErrorCode = (typeof ERROR_CODE_VALUES)[number];

export const APP_PLATFORM_OPTIONS = [
  { value: "mobile", label: "手机" },
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "desktop", label: "电脑" },
  { value: "windows", label: "Windows" },
  { value: "macos", label: "macOS" },
  { value: "linux", label: "Linux" },
  { value: "web", label: "网页" },
  { value: "h5", label: "H5" },
  { value: "wechat_mini_program", label: "微信小程序" },
  { value: "plugin", label: "插件" },
  { value: "browser_extension", label: "浏览器扩展" },
  { value: "server", label: "服务端" },
  { value: "api", label: "API" },
  { value: "cli", label: "命令行" }
] as const;

export type AppPlatform = (typeof APP_PLATFORM_OPTIONS)[number]["value"];
