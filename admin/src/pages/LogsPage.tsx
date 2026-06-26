import type { ProColumns } from "@ant-design/pro-components";
import { ProTable } from "@ant-design/pro-components";
import { App as AntApp, Tag } from "antd";
import { apiRequest, toQuery } from "../api";
import { useCatalogs } from "../hooks/useCatalogs";
import { formatAppOptionLabel } from "../shared/appPlatform";
import { LOG_ACTION_VALUE_ENUM, LOG_RESULT } from "../shared/constants";
import { formatDate } from "../shared/format";
import type { ListResponse } from "../shared/types";
import type { LogItem } from "../types";

export function LogsPage() {
  const { message } = AntApp.useApp();
  const { apps } = useCatalogs();

  const columns: ProColumns<LogItem>[] = [
    {
      title: "序号",
      valueType: "index",
      width: 72,
      search: false
    },
    {
      title: "关键词",
      dataIndex: "query",
      hideInTable: true,
      fieldProps: { placeholder: "搜索码后缀、错误码、消息" }
    },
    {
      title: "应用",
      dataIndex: "app_id",
      hideInTable: true,
      valueType: "select",
      fieldProps: {
        options: apps.map((app) => ({ value: app.app_id, label: formatAppOptionLabel(app) }))
      }
    },
    {
      title: "动作",
      dataIndex: "action",
      width: 140,
      valueType: "select",
      valueEnum: LOG_ACTION_VALUE_ENUM
    },
    { title: "时间", dataIndex: "created_at", width: 170, search: false, renderText: formatDate },
    {
      title: "结果",
      dataIndex: "result",
      width: 90,
      search: false,
      render: (_, row) => (row.result === LOG_RESULT.SUCCESS ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>)
    },
    {
      title: "应用",
      dataIndex: "app_name",
      search: false,
      render: (_, row) => row.app_name ?? row.app_id ?? "-"
    },
    { title: "码后缀", dataIndex: "code_suffix", width: 100, search: false, renderText: (value) => value ?? "-" },
    { title: "错误码", dataIndex: "error_code", width: 160, search: false, renderText: (value) => value ?? "-" },
    {
      title: "消息",
      dataIndex: "message",
      search: false,
      ellipsis: true,
      renderText: (_, row) => formatLogMessage(row)
    }
  ];

  return (
    <ProTable<LogItem>
      rowKey="id"
      columns={columns}
      cardBordered
      bordered
      scroll={{ x: 1152 }}
      search={{ labelWidth: 72, defaultCollapsed: false }}
      options={{ density: true, fullScreen: true, reload: true, setting: true }}
      pagination={{ defaultPageSize: 20, showSizeChanger: true }}
      request={async (params) => {
        try {
          const data = await apiRequest<ListResponse<LogItem>>(
            `/api/admin/logs${toQuery({
              query: params.query as string | undefined,
              app_id: params.app_id as string | undefined,
              action: params.action as string | undefined,
              page: params.current,
              page_size: params.pageSize
            })}`
          );
          return { data: data.items, total: data.total, success: true };
        } catch (error) {
          message.error(error instanceof Error ? error.message : "加载失败");
          return { data: [], total: 0, success: false };
        }
      }}
    />
  );
}

function formatLogMessage(row: LogItem) {
  if (!row.message) {
    return "-";
  }
  const exactMessages: Record<string, string> = {
    "Already active on this device": "该设备已激活",
    Activated: "激活成功",
    Verified: "校验成功",
    "Device rebound": "换机成功",
    "Device unbound": "解绑成功",
    "解绑成功": "解绑成功",
    "重新绑定成功": "重新绑定成功",
    "手动解绑设备": "手动解绑设备",
    "App is disabled": "应用已禁用",
    "Invalid app secret": "应用密钥无效",
    "Activation code not found": "激活码不存在",
    "Activation code has not been activated": "激活码尚未激活",
    "Activation code was deleted": "激活码已删除",
    "Activation code is disabled": "激活码已禁用",
    "Activation code has expired": "激活码已过期",
    "Activation code is bound to another device": "激活码已绑定其他设备",
    "Old device fingerprint does not match": "旧设备指纹不匹配",
    "Device fingerprint does not match": "设备指纹不匹配",
    "Device rebind limit exceeded": "解绑次数已达上限",
    "Device unbind limit exceeded": "解绑次数已达上限",
    "Device rebind is cooling down": "解绑冷却中",
    "Device unbind is cooling down": "解绑冷却中",
    "Device unbind conflict": "解绑操作冲突",
    "Activation code was bound by another request": "激活码已被其他请求绑定",
    "Activation code was activated by another request": "激活码已被其他请求激活"
  };
  if (exactMessages[row.message]) {
    return exactMessages[row.message];
  }
  const generatedMatch = row.message.match(/^Generated (\d+) (.+) codes$/);
  if (generatedMatch) {
    return `批量生成 ${generatedMatch[1]} 个 ${generatedMatch[2]} 激活码`;
  }
  const deletedMatch = row.message.match(/^Deleted by admin (\d+)$/);
  if (deletedMatch) {
    return `删除激活码，管理员 ID：${deletedMatch[1]}`;
  }
  const disabledMatch = row.message.match(/^Disabled by admin (\d+)$/);
  if (disabledMatch) {
    return `禁用激活码，管理员 ID：${disabledMatch[1]}`;
  }
  const enabledMatch = row.message.match(/^Enabled by admin (\d+)$/);
  if (enabledMatch) {
    return `启用激活码，管理员 ID：${enabledMatch[1]}`;
  }
  return row.message;
}
