import { DisconnectOutlined, CheckCircleOutlined, CloseOutlined, DeleteOutlined, StopOutlined } from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { ProTable } from "@ant-design/pro-components";
import { App as AntApp, Button, Space, Tag, Typography } from "antd";
import { useRef, useState } from "react";
import { apiRequest, toQuery } from "../api";
import { useCatalogs } from "../hooks/useCatalogs";
import { formatAppOptionLabel, formatAppPlatform } from "../shared/appPlatform";
import { useI18n } from "../i18n";
import {
  CODE_BULK_ACTION,
  CODE_STATUS,
  CODE_TOGGLE_STATUS,
  getCodeListStatusValueEnum,
  type CodeBulkAction
} from "../shared/constants";
import { formatDate, isExpired, statusTag } from "../shared/format";
import { formatPlanLabel } from "../shared/plan";
import type { ListResponse } from "../shared/types";
import type { CodeItem } from "../types";

const DISABLE_BUTTON_STYLE = { color: "#d48806" };
const DISABLE_CONFIRM_BUTTON_STYLE = { backgroundColor: "#d48806", borderColor: "#d48806" };
const ENABLE_BUTTON_STYLE = { color: "#389e0d" };
const ENABLE_CONFIRM_BUTTON_STYLE = { backgroundColor: "#389e0d", borderColor: "#389e0d" };

export function CodesPage() {
  const { message, modal } = AntApp.useApp();
  const { t } = useI18n();
  const { apps, plans } = useCatalogs();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedCount = selectedRowKeys.length;

  const columns: ProColumns<CodeItem>[] = [
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
      fieldProps: { placeholder: t("codes.searchPlaceholder") }
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
      title: t("common.plan"),
      dataIndex: "plan_code",
      hideInTable: true,
      valueType: "select",
      fieldProps: {
        options: plans.map((plan) => ({ value: plan.code, label: plan.name }))
      }
    },
    {
      title: t("codes.suffix"),
      dataIndex: "code_suffix",
      width: 96,
      search: false,
      render: (_, row) => <Typography.Text code>{row.code_suffix}</Typography.Text>
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      width: 96,
      valueType: "select",
      valueEnum: getCodeListStatusValueEnum(t),
      render: (_, row) => statusTag(row, t)
    },
    {
      title: t("codes.bindingStatus"),
      dataIndex: "device_hash",
      width: 104,
      search: false,
      render: (_, row) => (row.device_hash ? <Tag color="green">{t("status.bound")}</Tag> : <Tag color="default">{t("status.unbound")}</Tag>)
    },
    {
      title: t("common.app"),
      dataIndex: "app_name",
      width: 240,
      search: false,
      render: (_, row) => `${row.app_name} / ${formatAppPlatform(row.app_platform, t)}`
    },
    {
      title: t("common.plan"),
      dataIndex: "plan_name",
      width: 180,
      search: false,
      render: (_, row) => formatPlanLabel(row, t)
    },
    { title: t("codes.activatedAt"), dataIndex: "activated_at", width: 170, search: false, renderText: formatDate },
    { title: t("codes.expiresAt"), dataIndex: "expires_at", width: 170, search: false, renderText: formatDate },
    { title: t("codes.disabledAt"), dataIndex: "disabled_at", width: 170, search: false, renderText: formatDate },
    { title: t("codes.rebindCount"), dataIndex: "rebind_count", width: 72, search: false },
    {
      title: t("common.action"),
      valueType: "option",
      width: 230,
      fixed: "right",
      render: (_, row) => (
        <Space size={4}>
          <Button
            size="small"
            type="link"
            icon={<DisconnectOutlined />}
            aria-label={t("codes.unbindDevice")}
            disabled={!canManuallyUnbind(row)}
            onClick={() => {
              modal.confirm({
                title: t("codes.unbindDevice"),
                content: t("codes.unbindConfirm", { suffix: row.code_suffix }),
                okText: t("common.unbind"),
                cancelText: t("common.cancel"),
                onOk: async () => {
                  await apiRequest(`/api/admin/codes/${row.id}/unbind-device`, { method: "PATCH" });
                  message.success(t("common.unbind"));
                  actionRef.current?.reload();
                }
              });
            }}
          >
            {t("common.unbind")}
          </Button>
          <Button
            size="small"
            style={row.disabled_at ? ENABLE_BUTTON_STYLE : DISABLE_BUTTON_STYLE}
            type="link"
            icon={row.disabled_at ? <CheckCircleOutlined /> : <StopOutlined />}
            aria-label={row.disabled_at ? t("codes.enableCode") : t("codes.disableCode")}
            disabled={row.status === CODE_STATUS.DELETED}
            onClick={() => {
              const disabled = !row.disabled_at;
              modal.confirm({
                title: disabled ? t("codes.disableCode") : t("codes.enableCode"),
                content: disabled
                  ? t("codes.disableConfirm", { suffix: row.code_suffix })
                  : t("codes.enableConfirm", { suffix: row.code_suffix }),
                okText: disabled ? t("common.disable") : t("common.enable"),
                okButtonProps: {
                  style: disabled ? DISABLE_CONFIRM_BUTTON_STYLE : ENABLE_CONFIRM_BUTTON_STYLE
                },
                cancelText: t("common.cancel"),
                onOk: async () => {
                  await apiRequest(`/api/admin/codes/${row.id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      status: disabled ? CODE_TOGGLE_STATUS.DISABLED : CODE_TOGGLE_STATUS.ENABLED
                    })
                  });
                  message.success(disabled ? t("common.disabled") : t("common.enabled"));
                  actionRef.current?.reload();
                }
              });
            }}
          >
            {row.disabled_at ? t("common.enable") : t("common.disable")}
          </Button>
          <Button
            danger
            size="small"
            type="link"
            icon={<DeleteOutlined />}
            aria-label={t("codes.deleteCode")}
            disabled={row.status === CODE_STATUS.DELETED}
            onClick={() => {
              modal.confirm({
                title: t("codes.deleteCode"),
                content: t("codes.deleteConfirm", { suffix: row.code_suffix }),
                okText: t("common.delete"),
                okButtonProps: { danger: true },
                cancelText: t("common.cancel"),
                onOk: async () => {
                  await apiRequest(`/api/admin/codes/${row.id}`, { method: "DELETE" });
                  message.success(t("common.deleted"));
                  actionRef.current?.reload();
                }
              });
            }}
          >
            {t("common.delete")}
          </Button>
        </Space>
      )
    }
  ];

  return (
    <ProTable<CodeItem>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      cardBordered
      bordered
      scroll={{ x: 1620 }}
      rowSelection={{
        selectedRowKeys,
        getCheckboxProps: (row) => ({ disabled: row.status === CODE_STATUS.DELETED }),
        onChange: (keys) => setSelectedRowKeys(keys)
      }}
      search={{ labelWidth: 72, defaultCollapsed: false }}
      options={{ density: true, fullScreen: true, reload: true, setting: true }}
      pagination={{ defaultPageSize: 20, showSizeChanger: true }}
      tableAlertRender={false}
      tableAlertOptionRender={false}
      toolBarRender={() => [
        <Space key="selected-actions" size={8} wrap>
          <Typography.Text type={selectedCount > 0 ? undefined : "secondary"}>{t("codes.selected", { count: selectedCount })}</Typography.Text>
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            disabled={selectedCount === 0}
            onClick={() => bulkUpdateCodes(CODE_BULK_ACTION.ENABLE, selectedRowKeys)}
          >
            {t("codes.bulkEnable")}
          </Button>
          <Button
            size="small"
            icon={<StopOutlined />}
            style={DISABLE_BUTTON_STYLE}
            disabled={selectedCount === 0}
            onClick={() => bulkUpdateCodes(CODE_BULK_ACTION.DISABLE, selectedRowKeys)}
          >
            {t("codes.bulkDisable")}
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            disabled={selectedCount === 0}
            onClick={() => bulkUpdateCodes(CODE_BULK_ACTION.DELETE, selectedRowKeys)}
          >
            {t("codes.bulkDelete")}
          </Button>
          <Button size="small" icon={<CloseOutlined />} disabled={selectedCount === 0} onClick={() => setSelectedRowKeys([])}>
            {t("codes.clearSelection")}
          </Button>
        </Space>
      ]}
      request={async (params) => {
        try {
          const data = await apiRequest<ListResponse<CodeItem>>(
            `/api/admin/codes${toQuery({
              query: params.query as string | undefined,
              app_id: params.app_id as string | undefined,
              plan_code: params.plan_code as string | undefined,
              status: params.status as string | undefined,
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

  function bulkUpdateCodes(action: CodeBulkAction, keys: React.Key[]) {
    if (keys.length === 0) {
      message.warning(t("codes.selectFirst"));
      return;
    }
    const actionText =
      action === CODE_BULK_ACTION.DELETE ? t("common.delete") : action === CODE_BULK_ACTION.DISABLE ? t("common.disable") : t("common.enable");
    modal.confirm({
      title: t("codes.bulkTitle", { action: actionText }),
      content: t("codes.bulkConfirm", { action: actionText, count: keys.length }),
      okText: actionText,
      okButtonProps:
        action === CODE_BULK_ACTION.DELETE
          ? { danger: true }
          : action === CODE_BULK_ACTION.DISABLE
            ? { style: DISABLE_CONFIRM_BUTTON_STYLE }
            : undefined,
      cancelText: t("common.cancel"),
      onOk: async () => {
        const result = await apiRequest<{ action: string; requested: number; updated: number }>("/api/admin/codes/bulk", {
          method: "POST",
          body: JSON.stringify({
            action,
            ids: keys.map((key) => Number(key))
          })
        });
        message.success(t("codes.bulkSucceeded", { action: actionText, count: result.updated }));
        setSelectedRowKeys([]);
        actionRef.current?.reload();
      }
    });
  }
}

function canManuallyUnbind(row: CodeItem) {
  return row.status === CODE_STATUS.ACTIVE && !row.disabled_at && !isExpired(row.expires_at) && Boolean(row.device_hash);
}
