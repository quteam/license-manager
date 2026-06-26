import { CheckCircleOutlined, CopyOutlined, DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined, QuestionCircleOutlined, StopOutlined } from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { ProForm, ProFormSelect, ProFormText, ProFormTextArea, ProTable } from "@ant-design/pro-components";
import { App as AntApp, Button, Form, Input, Modal, Space, Tooltip, Typography } from "antd";
import { useRef, useState } from "react";
import { apiRequest } from "../api";
import { appPlatformOptions, formatAppPlatform } from "../shared/appPlatform";
import { CodeBlock } from "../shared/CodeBlock";
import { APP_STATUS, APP_STATUS_VALUE_ENUM } from "../shared/constants";
import { formatDate } from "../shared/format";
import type { AppItem } from "../types";

export function AppsPage() {
  const { message, modal } = AntApp.useApp();
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [usageApp, setUsageApp] = useState<AppItem | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const actionRef = useRef<ActionType | undefined>(undefined);

  const columns: ProColumns<AppItem>[] = [
    {
      title: "序号",
      valueType: "index",
      width: 64,
      search: false
    },
    {
      title: "应用 ID",
      dataIndex: "app_id",
      width: 220,
      render: (_, row) => <CopyableInlineCode value={row.app_id} label="应用 ID" />
    },
    { title: "名称", dataIndex: "name" },
    {
      title: "描述",
      dataIndex: "description",
      ellipsis: true,
      renderText: (text: string | null) => text || "-"
    },
    {
      title: "平台",
      dataIndex: "platform",
      width: 120,
      renderText: formatAppPlatform
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      valueEnum: APP_STATUS_VALUE_ENUM
    },
    { title: "创建时间", dataIndex: "created_at", width: 170, search: false, renderText: formatDate },
    {
      title: "操作",
      valueType: "option",
      width: 160,
      fixed: "right",
      render: (_, row) => (
        <AppActionButtons
          app={row}
          onUsage={() => setUsageApp(row)}
          onEdit={() => {
            setEditingApp(row);
            editForm.setFieldsValue({ name: row.name, description: row.description ?? undefined, platform: row.platform });
            setEditOpen(true);
          }}
          onRotateSecret={() => {
            modal.confirm({
              title: "更换应用密钥",
              content: `确认更换应用“${row.name}”的密钥？旧密钥会立即失效，客户端必须更新为新密钥。`,
              okText: "更换",
              okButtonProps: { danger: true },
              cancelText: "取消",
              onOk: async () => {
                const data = await apiRequest<{ app: AppItem; app_secret: string }>(`/api/admin/apps/${row.app_id}/secret`, {
                  method: "PATCH"
                });
                setSecret(data.app_secret);
                actionRef.current?.reload();
                message.success("已更换密钥");
              }
            });
          }}
          onToggleStatus={() => {
            const disabled = row.status === APP_STATUS.ACTIVE;
            modal.confirm({
              title: disabled ? "禁用应用" : "启用应用",
              content: disabled ? "禁用后客户端激活和校验会立即失败。" : "启用后客户端可继续激活和校验。",
              okText: disabled ? "禁用" : "启用",
              okButtonProps: {
                style: disabled
                  ? { backgroundColor: "#d48806", borderColor: "#d48806" }
                  : { backgroundColor: "#389e0d", borderColor: "#389e0d" }
              },
              cancelText: "取消",
              onOk: async () => {
                await apiRequest(`/api/admin/apps/${row.app_id}/status`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: disabled ? APP_STATUS.DISABLED : APP_STATUS.ACTIVE })
                });
                actionRef.current?.reload();
              }
            });
          }}
          onDelete={() => {
            modal.confirm({
              title: "删除应用",
              content: `确认删除应用“${row.name}”？已有激活码、批次或日志的应用不能删除。`,
              okText: "删除",
              okButtonProps: { danger: true },
              cancelText: "取消",
              onOk: async () => {
                await apiRequest(`/api/admin/apps/${row.app_id}`, { method: "DELETE" });
                actionRef.current?.reload();
                message.success("已删除");
              }
            });
          }}
        />
      )
    }
  ];

  return (
    <>
      <ProTable<AppItem>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        headerTitle="应用列表"
        cardBordered
        bordered
        scroll={{ x: 1080 }}
        search={false}
        pagination={false}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新增应用
          </Button>
        ]}
        options={{ density: true, reload: true, setting: true }}
        request={async () => {
          try {
            const data = await apiRequest<{ items: AppItem[] }>("/api/admin/apps");
            return { data: data.items, success: true };
          } catch (error) {
            message.error(error instanceof Error ? error.message : "加载失败");
            return { data: [], success: false };
          }
        }}
      />

      <Modal title="新增应用" open={createOpen} footer={null} destroyOnHidden onCancel={() => setCreateOpen(false)}>
        <ProForm
          form={createForm}
          layout="vertical"
          submitter={{
            searchConfig: { submitText: "创建应用" },
            submitButtonProps: { icon: <PlusOutlined /> },
            resetButtonProps: false
          }}
          onFinish={async (values) => {
            try {
              const data = await apiRequest<{ app: AppItem; app_secret: string }>("/api/admin/apps", {
                method: "POST",
                body: JSON.stringify(values)
              });
              setSecret(data.app_secret);
              setCreateOpen(false);
              createForm.resetFields();
              actionRef.current?.reload();
              message.success("创建成功");
              return true;
            } catch (error) {
              message.error(error instanceof Error ? error.message : "创建失败");
              return false;
            }
          }}
        >
          <AppFormFields />
        </ProForm>
      </Modal>

      <Modal
        title="修改应用"
        open={editOpen}
        footer={null}
        destroyOnHidden
        onCancel={() => {
          setEditOpen(false);
          setEditingApp(null);
        }}
      >
        <ProForm
          form={editForm}
          layout="vertical"
          submitter={{
            searchConfig: { submitText: "保存修改" },
            resetButtonProps: false
          }}
          onFinish={async (values) => {
            if (!editingApp) {
              return false;
            }
            try {
              await apiRequest<{ app: AppItem }>(`/api/admin/apps/${editingApp.app_id}`, {
                method: "PATCH",
                body: JSON.stringify(values)
              });
              setEditOpen(false);
              setEditingApp(null);
              editForm.resetFields();
              actionRef.current?.reload();
              message.success("修改成功");
              return true;
            } catch (error) {
              message.error(error instanceof Error ? error.message : "修改失败");
              return false;
            }
          }}
        >
          <AppFormFields />
        </ProForm>
      </Modal>

      <Modal title="应用密钥" open={Boolean(secret)} footer={null} destroyOnHidden onCancel={() => setSecret(null)}>
        {secret && (
          <Space direction="vertical" className="w-full" size="middle">
            <Typography.Text type="secondary">应用密钥只在创建后显示一次，请及时保存。</Typography.Text>
            <CopyableSecret value={secret} />
            <Button type="primary" onClick={() => setSecret(null)}>
              我已保存
            </Button>
          </Space>
        )}
      </Modal>

      <Modal title="使用说明" open={Boolean(usageApp)} footer={null} width={760} destroyOnHidden onCancel={() => setUsageApp(null)}>
        {usageApp && (
          <Space direction="vertical" className="w-full" size="middle">
            <Typography.Text type="secondary">
              当前应用 ID 为 <Typography.Text code>{usageApp.app_id}</Typography.Text>，请将创建应用时保存的 app_secret 填入代码中的占位符。
            </Typography.Text>
            <CodeBlock value={createUsageCode(usageApp.app_id, window.location.origin)} language="javascript" />
          </Space>
        )}
      </Modal>
    </>
  );
}

function AppFormFields() {
  return (
    <>
      <ProFormText name="name" label="应用名称" rules={[{ required: true, message: "请输入应用名称" }]} />
      <ProFormSelect
        name="platform"
        label="平台"
        options={appPlatformOptions}
        rules={[{ required: true, message: "请选择平台" }]}
      />
      <ProFormTextArea name="description" label="应用描述" fieldProps={{ rows: 3, maxLength: 300, showCount: true }} />
    </>
  );
}

function AppActionButtons({
  app,
  onUsage,
  onRotateSecret,
  onEdit,
  onToggleStatus,
  onDelete
}: {
  app: AppItem;
  onUsage: () => void;
  onRotateSecret: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const toggleTitle = app.status === APP_STATUS.ACTIVE ? "禁用应用" : "启用应用";

  return (
    <Space size={4}>
      <Tooltip title="使用说明">
        <Button size="small" type="link" icon={<QuestionCircleOutlined />} aria-label="使用说明" onClick={onUsage} />
      </Tooltip>
      <Tooltip title="更换应用密钥">
        <Button size="small" type="link" icon={<KeyOutlined />} aria-label="更换应用密钥" onClick={onRotateSecret} />
      </Tooltip>
      <Tooltip title="修改应用">
        <Button size="small" type="link" icon={<EditOutlined />} aria-label="修改应用" onClick={onEdit} />
      </Tooltip>
      <Tooltip title={toggleTitle}>
        <Button
          size="small"
          type="link"
          icon={app.status === APP_STATUS.ACTIVE ? <StopOutlined /> : <CheckCircleOutlined />}
          aria-label={toggleTitle}
          style={{ color: app.status === APP_STATUS.ACTIVE ? "#d48806" : "#389e0d" }}
          onClick={onToggleStatus}
        />
      </Tooltip>
      <Tooltip title="删除应用">
        <Button size="small" type="link" danger icon={<DeleteOutlined />} aria-label="删除应用" onClick={onDelete} />
      </Tooltip>
    </Space>
  );
}

function CopyableInlineCode({ value, label }: { value: string; label: string }) {
  const { message } = AntApp.useApp();

  return (
    <Space size={4}>
      <Typography.Text code className="select-all">
        {value}
      </Typography.Text>
      <Button
        size="small"
        type="text"
        icon={<CopyOutlined />}
        aria-label={`复制${label}`}
        title={`复制${label}`}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          message.success(`已复制${label}`);
        }}
      />
    </Space>
  );
}

function CopyableSecret({ value }: { value: string }) {
  const { message } = AntApp.useApp();

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Typography.Text type="secondary">应用密钥</Typography.Text>
        <Button
          size="small"
          type="text"
          icon={<CopyOutlined />}
          aria-label="复制应用密钥"
          title="复制应用密钥"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            message.success("已复制应用密钥");
          }}
        />
      </div>
      <Typography.Text code className="break-all">
        {value}
      </Typography.Text>
    </div>
  );
}

function createUsageCode(appId: string, apiBaseUrl: string) {
  return `const APP_ID = "${escapeJsString(appId)}";
const APP_SECRET = "替换为创建应用时保存的 app_secret";
const API_BASE_URL = "${escapeJsString(apiBaseUrl)}";

async function requestLicense(path, body) {
  const response = await fetch(\`\${API_BASE_URL}\${path}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET,
      ...body
    })
  });
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error?.message || "请求失败");
  }
  return payload.data;
}

export function activateLicense(code, deviceFingerprint) {
  return requestLicense("/api/client/activate", {
    code,
    device_fingerprint: deviceFingerprint
  });
}

export function verifyLicense(code, deviceFingerprint) {
  return requestLicense("/api/client/verify", {
    code,
    device_fingerprint: deviceFingerprint
  });
}

export function unbindDevice(code, deviceFingerprint) {
  return requestLicense("/api/client/unbind-device", {
    code,
    device_fingerprint: deviceFingerprint
  });
}`;
}

function escapeJsString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
