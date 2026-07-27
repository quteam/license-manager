import { CheckCircleOutlined, DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined, StopOutlined } from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { ProForm, ProFormSelect, ProFormText, ProTable } from "@ant-design/pro-components";
import { App as AntApp, Button, Form, Modal, Space } from "antd";
import { useRef, useState } from "react";
import { apiRequest } from "../api";
import { useI18n } from "../i18n";
import { formatDate } from "../shared/format";
import type { TenantItem } from "../types";

type TenantFormValues = {
  name: string;
  slug: string;
  status: "active" | "disabled";
  admin_username: string;
  admin_password: string;
};

export function TenantsPage() {
  const { message, modal } = AntApp.useApp();
  const { t } = useI18n();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [form] = Form.useForm<TenantFormValues>();
  const [passwordForm] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TenantItem | null>(null);
  const [resetting, setResetting] = useState<TenantItem | null>(null);

  const refresh = () => {
    actionRef.current?.reload();
    window.dispatchEvent(new Event("tenant-list-changed"));
  };

  const columns: ProColumns<TenantItem>[] = [
    { title: t("common.index"), valueType: "index", width: 64, search: false },
    { title: t("tenants.name"), dataIndex: "name" },
    { title: t("tenants.slug"), dataIndex: "slug" },
    { title: t("tenants.admin"), dataIndex: "admin_usernames", renderText: (value) => value || "-" },
    { title: t("tenants.apps"), dataIndex: "app_count", width: 90, search: false },
    {
      title: t("common.status"),
      dataIndex: "status",
      width: 100,
      valueEnum: {
        active: { text: t("common.enabled"), status: "Success" },
        disabled: { text: t("common.disabled"), status: "Default" }
      }
    },
    { title: t("tenants.createdAt"), dataIndex: "created_at", width: 170, search: false, renderText: formatDate },
    {
      title: t("common.action"),
      valueType: "option",
      width: 190,
      render: (_, row) => (
        <Space size={4}>
          <Button
            type="text"
            icon={<EditOutlined />}
            title={t("common.edit")}
            onClick={() => {
              form.setFieldsValue({ name: row.name, slug: row.slug, status: row.status });
              setEditing(row);
            }}
          />
          <Button type="text" icon={<KeyOutlined />} title={t("tenants.resetPassword")} onClick={() => setResetting(row)} />
          <Button
            type="text"
            icon={row.status === "active" ? <StopOutlined /> : <CheckCircleOutlined />}
            title={row.status === "active" ? t("common.disable") : t("common.enable")}
            onClick={() => {
              const nextStatus = row.status === "active" ? "disabled" : "active";
              modal.confirm({
                title: nextStatus === "disabled" ? t("tenants.disable") : t("tenants.enable"),
                content: t("tenants.statusConfirm", { name: row.name }),
                onOk: async () => {
                  await apiRequest(`/api/admin/tenants/${row.id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: nextStatus })
                  });
                  refresh();
                }
              });
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            title={t("common.delete")}
            onClick={() => modal.confirm({
              title: t("tenants.delete"),
              content: t("tenants.deleteConfirm", { name: row.name }),
              okButtonProps: { danger: true },
              onOk: async () => {
                await apiRequest(`/api/admin/tenants/${row.id}`, { method: "DELETE" });
                message.success(t("common.deleted"));
                refresh();
              }
            })}
          />
        </Space>
      )
    }
  ];

  return (
    <>
      <ProTable<TenantItem>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        pagination={false}
        bordered
        cardBordered
        headerTitle={t("tenants.list")}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t("tenants.create")}
          </Button>
        ]}
        request={async () => {
          try {
            const data = await apiRequest<{ items: TenantItem[] }>("/api/admin/tenants");
            return { data: data.items, success: true };
          } catch (error) {
            message.error(error instanceof Error ? error.message : t("common.loadingFailed"));
            return { data: [], success: false };
          }
        }}
      />

      <Modal title={editing ? t("tenants.edit") : t("tenants.create")} open={createOpen || Boolean(editing)} footer={null} destroyOnHidden onCancel={() => {
        setCreateOpen(false);
        setEditing(null);
        form.resetFields();
      }}>
        <ProForm<TenantFormValues>
          form={form}
          layout="vertical"
          initialValues={{ status: "active" }}
          onFinish={async (values) => {
            try {
              await apiRequest(editing ? `/api/admin/tenants/${editing.id}` : "/api/admin/tenants", {
                method: editing ? "PATCH" : "POST",
                body: JSON.stringify(editing ? { name: values.name, slug: values.slug } : values)
              });
              setCreateOpen(false);
              setEditing(null);
              form.resetFields();
              message.success(editing ? t("common.editSucceeded") : t("common.createSucceeded"));
              refresh();
              return true;
            } catch (error) {
              message.error(error instanceof Error ? error.message : t("common.requestFailed"));
              return false;
            }
          }}
        >
          <ProFormText name="name" label={t("tenants.name")} rules={[{ required: true }]} />
          <ProFormText name="slug" label={t("tenants.slug")} rules={[{ required: true }, { pattern: /^[a-z0-9][a-z0-9-]{1,62}$/, message: t("tenants.slugHelp") }]} />
          {!editing && <>
            <ProFormSelect name="status" label={t("common.status")} options={[{ label: t("common.enabled"), value: "active" }, { label: t("common.disabled"), value: "disabled" }]} />
            <ProFormText name="admin_username" label={t("tenants.admin")} rules={[{ required: true }]} />
            <ProFormText.Password name="admin_password" label={t("tenants.adminPassword")} rules={[{ required: true }, { min: 8 }]} />
          </>}
        </ProForm>
      </Modal>

      <Modal title={t("tenants.resetPassword")} open={Boolean(resetting)} footer={null} destroyOnHidden onCancel={() => {
        setResetting(null);
        passwordForm.resetFields();
      }}>
        <ProForm
          form={passwordForm}
          layout="vertical"
          initialValues={{ username: resetting?.admin_usernames?.split(",")[0] }}
          onFinish={async (values) => {
            if (!resetting) return false;
            try {
              await apiRequest(`/api/admin/tenants/${resetting.id}/admin-password`, {
                method: "PATCH",
                body: JSON.stringify(values)
              });
              setResetting(null);
              passwordForm.resetFields();
              message.success(t("tenants.passwordReset"));
              return true;
            } catch (error) {
              message.error(error instanceof Error ? error.message : t("common.requestFailed"));
              return false;
            }
          }}
        >
          <ProFormText name="username" label={t("tenants.admin")} rules={[{ required: true }]} />
          <ProFormText.Password name="new_password" label={t("tenants.newPassword")} rules={[{ required: true }, { min: 8 }]} />
        </ProForm>
      </Modal>
    </>
  );
}
