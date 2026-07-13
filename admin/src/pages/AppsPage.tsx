import { CheckCircleOutlined, CopyOutlined, DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined, QuestionCircleOutlined, StopOutlined } from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { ProForm, ProFormSelect, ProFormText, ProFormTextArea, ProTable } from "@ant-design/pro-components";
import { App as AntApp, Button, Form, Input, Modal, Space, Tooltip, Typography } from "antd";
import { useRef, useState } from "react";
import { apiRequest } from "../api";
import { formatAppPlatform, getAppPlatformOptions } from "../shared/appPlatform";
import { CodeBlock } from "../shared/CodeBlock";
import { APP_STATUS, getAppStatusValueEnum } from "../shared/constants";
import { formatDate } from "../shared/format";
import { useI18n } from "../i18n";
import type { AppItem } from "../types";

export function AppsPage() {
  const { message, modal } = AntApp.useApp();
  const { t } = useI18n();
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
      title: t("common.index"),
      valueType: "index",
      width: 64,
      search: false
    },
    {
      title: t("apps.appId"),
      dataIndex: "app_id",
      width: 220,
      render: (_, row) => <CopyableInlineCode value={row.app_id} label={t("apps.appId")} />
    },
    { title: t("apps.name"), dataIndex: "name" },
    {
      title: t("apps.description"),
      dataIndex: "description",
      ellipsis: true,
      renderText: (text: string | null) => text || "-"
    },
    {
      title: t("apps.purchaseUrl"),
      dataIndex: "purchase_url",
      width: 150,
      ellipsis: true,
      render: (_, row) =>
        row.purchase_url ? (
          <Typography.Link href={row.purchase_url} target="_blank" rel="noreferrer" ellipsis>
            {t("apps.buyLicense")}
          </Typography.Link>
        ) : (
          "-"
        )
    },
    {
      title: t("apps.platform"),
      dataIndex: "platform",
      width: 120,
      renderText: (platform) => formatAppPlatform(platform, t)
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      width: 100,
      valueEnum: getAppStatusValueEnum(t)
    },
    { title: t("apps.createdAt"), dataIndex: "created_at", width: 170, search: false, renderText: formatDate },
    {
      title: t("common.action"),
      valueType: "option",
      width: 160,
      fixed: "right",
      render: (_, row) => (
        <AppActionButtons
          app={row}
          onUsage={() => setUsageApp(row)}
          onEdit={() => {
            setEditingApp(row);
            editForm.setFieldsValue({
              name: row.name,
              description: row.description ?? undefined,
              purchase_url: row.purchase_url ?? undefined,
              platform: row.platform
            });
            setEditOpen(true);
          }}
          onRotateSecret={() => {
            modal.confirm({
              title: t("apps.rotateSecret"),
              content: t("apps.rotateSecretConfirm", { name: row.name }),
              okText: t("apps.rotate"),
              okButtonProps: { danger: true },
              cancelText: t("common.cancel"),
              onOk: async () => {
                const data = await apiRequest<{ app: AppItem; app_secret: string }>(`/api/admin/apps/${row.app_id}/secret`, {
                  method: "PATCH"
                });
                setSecret(data.app_secret);
                actionRef.current?.reload();
                message.success(t("common.changedSecret"));
              }
            });
          }}
          onToggleStatus={() => {
            const disabled = row.status === APP_STATUS.ACTIVE;
            modal.confirm({
              title: disabled ? t("apps.disableApp") : t("apps.enableApp"),
              content: disabled ? t("apps.disableAppConfirm") : t("apps.enableAppConfirm"),
              okText: disabled ? t("common.disable") : t("common.enable"),
              okButtonProps: {
                style: disabled
                  ? { backgroundColor: "#d48806", borderColor: "#d48806" }
                  : { backgroundColor: "#389e0d", borderColor: "#389e0d" }
              },
              cancelText: t("common.cancel"),
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
              title: t("apps.deleteApp"),
              content: t("apps.deleteAppConfirm", { name: row.name }),
              okText: t("common.delete"),
              okButtonProps: { danger: true },
              cancelText: t("common.cancel"),
              onOk: async () => {
                await apiRequest(`/api/admin/apps/${row.app_id}`, { method: "DELETE" });
                actionRef.current?.reload();
                message.success(t("common.deleted"));
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
        headerTitle={t("apps.list")}
        cardBordered
        bordered
        scroll={{ x: 1230 }}
        search={false}
        pagination={false}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t("apps.createApp")}
          </Button>
        ]}
        options={{ density: true, reload: true, setting: true }}
        request={async () => {
          try {
            const data = await apiRequest<{ items: AppItem[] }>("/api/admin/apps");
            return { data: data.items, success: true };
          } catch (error) {
            message.error(error instanceof Error ? error.message : t("common.loadingFailed"));
            return { data: [], success: false };
          }
        }}
      />

      <Modal title={t("apps.createApp")} open={createOpen} footer={null} destroyOnHidden onCancel={() => setCreateOpen(false)}>
        <ProForm
          form={createForm}
          layout="vertical"
          submitter={{
            searchConfig: { submitText: t("apps.createSubmit") },
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
              message.success(t("common.createSucceeded"));
              return true;
            } catch (error) {
              message.error(error instanceof Error ? error.message : t("common.createFailed"));
              return false;
            }
          }}
        >
          <AppFormFields />
        </ProForm>
      </Modal>

      <Modal
        title={t("apps.editApp")}
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
            searchConfig: { submitText: t("apps.editSubmit") },
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
              message.success(t("common.editSucceeded"));
              return true;
            } catch (error) {
              message.error(error instanceof Error ? error.message : t("common.editFailed"));
              return false;
            }
          }}
        >
          <AppFormFields />
        </ProForm>
      </Modal>

      <Modal title={t("apps.appSecret")} open={Boolean(secret)} footer={null} destroyOnHidden onCancel={() => setSecret(null)}>
        {secret && (
          <Space direction="vertical" className="w-full" size="middle">
            <Typography.Text type="secondary">{t("apps.secretOnce")}</Typography.Text>
            <CopyableSecret value={secret} />
            <Button type="primary" onClick={() => setSecret(null)}>
              {t("common.saved")}
            </Button>
          </Space>
        )}
      </Modal>

      <Modal title={t("apps.usage")} open={Boolean(usageApp)} footer={null} width={760} destroyOnHidden onCancel={() => setUsageApp(null)}>
        {usageApp && (
          <Space direction="vertical" className="w-full" size="middle">
            <Typography.Text type="secondary">
              {t("apps.usageText", { appId: usageApp.app_id })}
            </Typography.Text>
            <CodeBlock value={createUsageCode(usageApp.app_id, window.location.origin, t)} language="javascript" />
          </Space>
        )}
      </Modal>
    </>
  );
}

function AppFormFields() {
  const { t } = useI18n();

  return (
    <>
      <ProFormText name="name" label={t("apps.appName")} rules={[{ required: true, message: t("apps.appNameRequired") }]} />
      <ProFormSelect
        name="platform"
        label={t("apps.platform")}
        options={getAppPlatformOptions(t)}
        rules={[{ required: true, message: t("apps.platformRequired") }]}
      />
      <ProFormTextArea name="description" label={t("apps.appDescription")} fieldProps={{ rows: 3, maxLength: 300, showCount: true }} />
      <ProFormText
        name="purchase_url"
        label={t("apps.purchaseUrl")}
        placeholder={t("apps.purchaseUrlPlaceholder")}
        rules={[{ type: "url", message: t("apps.purchaseUrlInvalid") }]}
      />
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
  const { t } = useI18n();
  const toggleTitle = app.status === APP_STATUS.ACTIVE ? t("apps.disableApp") : t("apps.enableApp");

  return (
    <Space size={4}>
      <Tooltip title={t("apps.usage")}>
        <Button size="small" type="link" icon={<QuestionCircleOutlined />} aria-label={t("apps.usage")} onClick={onUsage} />
      </Tooltip>
      <Tooltip title={t("apps.rotateSecret")}>
        <Button size="small" type="link" icon={<KeyOutlined />} aria-label={t("apps.rotateSecret")} onClick={onRotateSecret} />
      </Tooltip>
      <Tooltip title={t("apps.editApp")}>
        <Button size="small" type="link" icon={<EditOutlined />} aria-label={t("apps.editApp")} onClick={onEdit} />
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
      <Tooltip title={t("apps.deleteApp")}>
        <Button size="small" type="link" danger icon={<DeleteOutlined />} aria-label={t("apps.deleteApp")} onClick={onDelete} />
      </Tooltip>
    </Space>
  );
}

function CopyableInlineCode({ value, label }: { value: string; label: string }) {
  const { message } = AntApp.useApp();
  const { t } = useI18n();

  return (
    <Space size={4}>
      <Typography.Text code className="select-all">
        {value}
      </Typography.Text>
      <Button
        size="small"
        type="text"
        icon={<CopyOutlined />}
        aria-label={t("common.copiedLabel", { label })}
        title={t("common.copy")}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          message.success(t("common.copiedLabel", { label }));
        }}
      />
    </Space>
  );
}

function CopyableSecret({ value }: { value: string }) {
  const { message } = AntApp.useApp();
  const { t } = useI18n();

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Typography.Text type="secondary">{t("apps.appSecret")}</Typography.Text>
        <Button
          size="small"
          type="text"
          icon={<CopyOutlined />}
          aria-label={t("apps.copyAppSecret")}
          title={t("apps.copyAppSecret")}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            message.success(t("common.copiedLabel", { label: t("apps.appSecret") }));
          }}
        />
      </div>
      <Typography.Text code className="break-all">
        {value}
      </Typography.Text>
    </div>
  );
}

function createUsageCode(appId: string, apiBaseUrl: string, t: (key: string) => string) {
  return `const APP_ID = "${escapeJsString(appId)}";
const APP_SECRET = "${escapeJsString(t("docs.secretPlaceholder"))}";
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
    throw new Error(payload.error?.message || "${escapeJsString(t("docs.errorFallback"))}");
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
