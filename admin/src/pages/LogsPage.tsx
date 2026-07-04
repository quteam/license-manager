import type { ProColumns } from "@ant-design/pro-components";
import { ProTable } from "@ant-design/pro-components";
import { App as AntApp, Tag } from "antd";
import { apiRequest, toQuery } from "../api";
import { useCatalogs } from "../hooks/useCatalogs";
import { formatAppOptionLabel } from "../shared/appPlatform";
import { getLogActionValueEnum, LOG_RESULT } from "../shared/constants";
import { formatDate } from "../shared/format";
import { useI18n } from "../i18n";
import type { ListResponse } from "../shared/types";
import type { LogItem } from "../types";

export function LogsPage() {
  const { message } = AntApp.useApp();
  const { t } = useI18n();
  const { apps } = useCatalogs();

  const columns: ProColumns<LogItem>[] = [
    {
      title: t("common.index"),
      valueType: "index",
      width: 72,
      search: false
    },
    {
      title: t("common.keyword"),
      dataIndex: "query",
      hideInTable: true,
      fieldProps: { placeholder: t("logs.searchPlaceholder") }
    },
    {
      title: t("common.app"),
      dataIndex: "app_id",
      hideInTable: true,
      valueType: "select",
      fieldProps: {
        options: apps.map((app) => ({ value: app.app_id, label: formatAppOptionLabel(app, t) }))
      }
    },
    {
      title: t("common.action"),
      dataIndex: "action",
      width: 140,
      valueType: "select",
      valueEnum: getLogActionValueEnum(t)
    },
    { title: t("common.time"), dataIndex: "created_at", width: 170, search: false, renderText: formatDate },
    {
      title: t("common.result"),
      dataIndex: "result",
      width: 90,
      search: false,
      render: (_, row) => (row.result === LOG_RESULT.SUCCESS ? <Tag color="green">{t("common.success")}</Tag> : <Tag color="red">{t("common.failure")}</Tag>)
    },
    {
      title: t("common.app"),
      dataIndex: "app_name",
      search: false,
      render: (_, row) => row.app_name ?? row.app_id ?? "-"
    },
    { title: t("logs.codeSuffix"), dataIndex: "code_suffix", width: 100, search: false, renderText: (value) => value ?? "-" },
    { title: t("logs.errorCode"), dataIndex: "error_code", width: 160, search: false, renderText: (value) => value ?? "-" },
    {
      title: t("common.message"),
      dataIndex: "message",
      search: false,
      ellipsis: true,
      renderText: (_, row) => formatLogMessage(row, t)
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
          message.error(error instanceof Error ? error.message : t("common.loadingFailed"));
          return { data: [], total: 0, success: false };
        }
      }}
    />
  );
}

function formatLogMessage(row: LogItem, t: (key: string, values?: Record<string, string | number>) => string) {
  if (!row.message) {
    return "-";
  }
  const exactMessages: Record<string, string> = {
    "Already active on this device": t("logs.alreadyActive"),
    Activated: t("logs.activated"),
    Verified: t("logs.verified"),
    "Device rebound": t("logs.deviceRebound"),
    "Device unbound": t("logs.deviceUnbound"),
    "解绑成功": t("logs.deviceUnbound"),
    "重新绑定成功": t("logs.deviceRebound"),
    "手动解绑设备": t("logs.manualUnbound"),
    "App is disabled": t("logs.appDisabled"),
    "Invalid app secret": t("logs.invalidAppSecret"),
    "Activation code not found": t("logs.codeNotFound"),
    "Activation code has not been activated": t("logs.codeNotActivated"),
    "Activation code was deleted": t("logs.codeDeleted"),
    "Activation code is disabled": t("logs.codeDisabled"),
    "Activation code has expired": t("logs.codeExpired"),
    "Activation code is bound to another device": t("logs.codeBoundOther"),
    "Old device fingerprint does not match": t("logs.oldFingerprintMismatch"),
    "Device fingerprint does not match": t("logs.fingerprintMismatch"),
    "Device rebind limit exceeded": t("logs.unbindLimit"),
    "Device unbind limit exceeded": t("logs.unbindLimit"),
    "Device rebind is cooling down": t("logs.unbindCooldown"),
    "Device unbind is cooling down": t("logs.unbindCooldown"),
    "Device unbind conflict": t("logs.unbindConflict"),
    "Activation code was bound by another request": t("logs.codeBoundByOtherRequest"),
    "Activation code was activated by another request": t("logs.codeActivatedByOtherRequest")
  };
  if (exactMessages[row.message]) {
    return exactMessages[row.message];
  }
  const generatedMatch = row.message.match(/^Generated (\d+) (.+) codes$/);
  if (generatedMatch) {
    return t("logs.generatedMessage", { count: generatedMatch[1], plan: generatedMatch[2] });
  }
  const deletedMatch = row.message.match(/^Deleted by admin (\d+)$/);
  if (deletedMatch) {
    return t("logs.deletedByAdmin", { adminId: deletedMatch[1] });
  }
  const disabledMatch = row.message.match(/^Disabled by admin (\d+)$/);
  if (disabledMatch) {
    return t("logs.disabledByAdmin", { adminId: disabledMatch[1] });
  }
  const enabledMatch = row.message.match(/^Enabled by admin (\d+)$/);
  if (enabledMatch) {
    return t("logs.enabledByAdmin", { adminId: enabledMatch[1] });
  }
  return row.message;
}
