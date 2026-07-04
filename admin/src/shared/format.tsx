import { Tag } from "antd";
import dayjs from "dayjs";
import type { CodeItem } from "../types";
import { CODE_STATUS } from "./constants";

export function formatDate(value: string | null): string {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

export function isExpired(value: string | null): boolean {
  return value !== null && dayjs(value).isBefore(dayjs());
}

type Translate = (key: string) => string;

export function statusTag(code: CodeItem, t?: Translate) {
  if (code.status === CODE_STATUS.DELETED) {
    return <Tag color="default">{t ? t("status.deleted") : "已删除"}</Tag>;
  }
  if (code.disabled_at) {
    return <Tag color="orange">{t ? t("status.codeDisabled") : "已禁用"}</Tag>;
  }
  if (code.status === CODE_STATUS.UNUSED) {
    return <Tag color="blue">{t ? t("status.unused") : "未激活"}</Tag>;
  }
  if (isExpired(code.expires_at)) {
    return <Tag color="red">{t ? t("status.expired") : "已过期"}</Tag>;
  }
  return <Tag color="green">{t ? t("status.active") : "已激活"}</Tag>;
}
