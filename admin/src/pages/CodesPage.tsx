import { DisconnectOutlined, CheckCircleOutlined, CloseOutlined, DeleteOutlined, StopOutlined } from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { ProTable } from "@ant-design/pro-components";
import { App as AntApp, Button, Space, Tag, Typography } from "antd";
import { useRef, useState } from "react";
import { apiRequest, toQuery } from "../api";
import { useCatalogs } from "../hooks/useCatalogs";
import { formatAppOptionLabel, formatAppPlatform } from "../shared/appPlatform";
import {
  CODE_BULK_ACTION,
  CODE_LIST_STATUS_VALUE_ENUM,
  CODE_STATUS,
  CODE_TOGGLE_STATUS,
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
  const { apps, plans } = useCatalogs();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedCount = selectedRowKeys.length;

  const columns: ProColumns<CodeItem>[] = [
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
      fieldProps: { placeholder: "搜索后缀、应用 ID、应用名" }
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
      title: "套餐",
      dataIndex: "plan_code",
      hideInTable: true,
      valueType: "select",
      fieldProps: {
        options: plans.map((plan) => ({ value: plan.code, label: plan.name }))
      }
    },
    {
      title: "后缀",
      dataIndex: "code_suffix",
      width: 96,
      search: false,
      render: (_, row) => <Typography.Text code>{row.code_suffix}</Typography.Text>
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 96,
      valueType: "select",
      valueEnum: CODE_LIST_STATUS_VALUE_ENUM,
      render: (_, row) => statusTag(row)
    },
    {
      title: "绑定状态",
      dataIndex: "device_hash",
      width: 104,
      search: false,
      render: (_, row) => (row.device_hash ? <Tag color="green">已绑定</Tag> : <Tag color="default">未绑定</Tag>)
    },
    {
      title: "应用",
      dataIndex: "app_name",
      width: 240,
      search: false,
      render: (_, row) => `${row.app_name} / ${formatAppPlatform(row.app_platform)}`
    },
    {
      title: "套餐",
      dataIndex: "plan_name",
      width: 180,
      search: false,
      render: (_, row) => formatPlanLabel(row)
    },
    { title: "激活时间", dataIndex: "activated_at", width: 170, search: false, renderText: formatDate },
    { title: "过期时间", dataIndex: "expires_at", width: 170, search: false, renderText: formatDate },
    { title: "禁用时间", dataIndex: "disabled_at", width: 170, search: false, renderText: formatDate },
    { title: "解绑", dataIndex: "rebind_count", width: 72, search: false },
    {
      title: "操作",
      valueType: "option",
      width: 230,
      fixed: "right",
      render: (_, row) => (
        <Space size={4}>
          <Button
            size="small"
            type="link"
            icon={<DisconnectOutlined />}
            aria-label="解绑设备"
            disabled={!canManuallyUnbind(row)}
            onClick={() => {
              modal.confirm({
                title: "解绑设备",
                content: `确认解除后缀为 ${row.code_suffix} 的激活码设备绑定？解绑后用户需要在新设备重新激活绑定。`,
                okText: "解绑",
                cancelText: "取消",
                onOk: async () => {
                  await apiRequest(`/api/admin/codes/${row.id}/unbind-device`, { method: "PATCH" });
                  message.success("已解绑");
                  actionRef.current?.reload();
                }
              });
            }}
          >
            解绑
          </Button>
          <Button
            size="small"
            style={row.disabled_at ? ENABLE_BUTTON_STYLE : DISABLE_BUTTON_STYLE}
            type="link"
            icon={row.disabled_at ? <CheckCircleOutlined /> : <StopOutlined />}
            aria-label={row.disabled_at ? "启用激活码" : "禁用激活码"}
            disabled={row.status === CODE_STATUS.DELETED}
            onClick={() => {
              const disabled = !row.disabled_at;
              modal.confirm({
                title: disabled ? "禁用激活码" : "启用激活码",
                content: disabled
                  ? `禁用后缀为 ${row.code_suffix} 的激活码后，客户端激活、校验和解绑会失败。`
                  : `确认启用后缀为 ${row.code_suffix} 的激活码？`,
                okText: disabled ? "禁用" : "启用",
                okButtonProps: {
                  style: disabled ? DISABLE_CONFIRM_BUTTON_STYLE : ENABLE_CONFIRM_BUTTON_STYLE
                },
                cancelText: "取消",
                onOk: async () => {
                  await apiRequest(`/api/admin/codes/${row.id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      status: disabled ? CODE_TOGGLE_STATUS.DISABLED : CODE_TOGGLE_STATUS.ENABLED
                    })
                  });
                  message.success(disabled ? "已禁用" : "已启用");
                  actionRef.current?.reload();
                }
              });
            }}
          >
            {row.disabled_at ? "启用" : "禁用"}
          </Button>
          <Button
            danger
            size="small"
            type="link"
            icon={<DeleteOutlined />}
            aria-label="删除激活码"
            disabled={row.status === CODE_STATUS.DELETED}
            onClick={() => {
              modal.confirm({
                title: "删除激活码",
                content: `确认删除后缀为 ${row.code_suffix} 的激活码？`,
                okText: "删除",
                okButtonProps: { danger: true },
                cancelText: "取消",
                onOk: async () => {
                  await apiRequest(`/api/admin/codes/${row.id}`, { method: "DELETE" });
                  message.success("已删除");
                  actionRef.current?.reload();
                }
              });
            }}
          >
            删除
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
          <Typography.Text type={selectedCount > 0 ? undefined : "secondary"}>已选择 {selectedCount} 项</Typography.Text>
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            disabled={selectedCount === 0}
            onClick={() => bulkUpdateCodes(CODE_BULK_ACTION.ENABLE, selectedRowKeys)}
          >
            批量启用
          </Button>
          <Button
            size="small"
            icon={<StopOutlined />}
            style={DISABLE_BUTTON_STYLE}
            disabled={selectedCount === 0}
            onClick={() => bulkUpdateCodes(CODE_BULK_ACTION.DISABLE, selectedRowKeys)}
          >
            批量禁用
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            disabled={selectedCount === 0}
            onClick={() => bulkUpdateCodes(CODE_BULK_ACTION.DELETE, selectedRowKeys)}
          >
            批量删除
          </Button>
          <Button size="small" icon={<CloseOutlined />} disabled={selectedCount === 0} onClick={() => setSelectedRowKeys([])}>
            取消选择
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
          message.error(error instanceof Error ? error.message : "加载失败");
          return { data: [], total: 0, success: false };
        }
      }}
    />
  );

  function bulkUpdateCodes(action: CodeBulkAction, keys: React.Key[]) {
    if (keys.length === 0) {
      message.warning("请先选择激活码");
      return;
    }
    const actionText =
      action === CODE_BULK_ACTION.DELETE ? "删除" : action === CODE_BULK_ACTION.DISABLE ? "禁用" : "启用";
    modal.confirm({
      title: `批量${actionText}激活码`,
      content: `确认${actionText}选中的 ${keys.length} 个激活码？`,
      okText: actionText,
      okButtonProps:
        action === CODE_BULK_ACTION.DELETE
          ? { danger: true }
          : action === CODE_BULK_ACTION.DISABLE
            ? { style: DISABLE_CONFIRM_BUTTON_STYLE }
            : undefined,
      cancelText: "取消",
      onOk: async () => {
        const result = await apiRequest<{ action: string; requested: number; updated: number }>("/api/admin/codes/bulk", {
          method: "POST",
          body: JSON.stringify({
            action,
            ids: keys.map((key) => Number(key))
          })
        });
        message.success(`已${actionText} ${result.updated} 个激活码`);
        setSelectedRowKeys([]);
        actionRef.current?.reload();
      }
    });
  }
}

function canManuallyUnbind(row: CodeItem) {
  return row.status === CODE_STATUS.ACTIVE && !row.disabled_at && !isExpired(row.expires_at) && Boolean(row.device_hash);
}
