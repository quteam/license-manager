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

export function statusTag(code: CodeItem) {
  if (code.status === CODE_STATUS.DELETED) {
    return <Tag color="default">已删除</Tag>;
  }
  if (code.disabled_at) {
    return <Tag color="orange">已禁用</Tag>;
  }
  if (code.status === CODE_STATUS.UNUSED) {
    return <Tag color="blue">未激活</Tag>;
  }
  if (isExpired(code.expires_at)) {
    return <Tag color="red">已过期</Tag>;
  }
  return <Tag color="green">已激活</Tag>;
}
