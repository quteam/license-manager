import { DeleteOutlined, EditOutlined, PlusOutlined, RocketOutlined, StopOutlined } from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { ProForm, ProFormSelect, ProFormSwitch, ProFormText, ProFormTextArea, ProTable } from "@ant-design/pro-components";
import { App as AntApp, Button, Form, Modal, Space, Tag } from "antd";
import { useRef, useState } from "react";
import { apiRequest, toQuery } from "../api";
import { useI18n } from "../i18n";
import { VERSION_STATUS, getVersionStatusValueEnum } from "../shared/constants";
import { formatDate } from "../shared/format";
import type { AppItem, VersionItem } from "../types";

type ListResponse<T> = { items: T[]; total: number };

export function VersionsPage() {
  const { message, modal } = AntApp.useApp();
  const { t } = useI18n();
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<VersionItem | null>(null);
  const actionRef = useRef<ActionType | undefined>(undefined);

  const loadApps = async () => {
    const data = await apiRequest<{ items: AppItem[] }>("/api/admin/apps");
    return data.items.map((app) => ({ label: `${app.name} (${app.app_id})`, value: app.app_id }));
  };

  const publishVersion = (row: VersionItem) => {
    modal.confirm({
      title: t("versions.publish"),
      content: t("versions.publishConfirm", { version: row.version }),
      okText: t("versions.publish"),
      cancelText: t("common.cancel"),
      onOk: async () => {
        await apiRequest(`/api/admin/versions/${row.id}/publish`, { method: "POST" });
        message.success(t("versions.published"));
        actionRef.current?.reload();
      }
    });
  };

  const unpublishVersion = (row: VersionItem) => {
    modal.confirm({
      title: t("versions.unpublish"),
      content: t("versions.unpublishConfirm", { version: row.version }),
      okText: t("versions.unpublish"),
      cancelText: t("common.cancel"),
      onOk: async () => {
        await apiRequest(`/api/admin/versions/${row.id}/unpublish`, { method: "POST" });
        message.success(t("versions.unpublished"));
        actionRef.current?.reload();
      }
    });
  };

  const deleteVersion = (row: VersionItem) => {
    modal.confirm({
      title: t("versions.delete"),
      content: t("versions.deleteConfirm", { version: row.version }),
      okText: t("common.delete"),
      okButtonProps: { danger: true },
      cancelText: t("common.cancel"),
      onOk: async () => {
        await apiRequest(`/api/admin/versions/${row.id}`, { method: "DELETE" });
        message.success(t("versions.deleted"));
        actionRef.current?.reload();
      }
    });
  };

  const columns: ProColumns<VersionItem>[] = [
    {
      title: t("common.index"),
      valueType: "index",
      width: 64,
      search: false
    },
    {
      title: t("versions.app"),
      dataIndex: "app_name",
      width: 160,
      search: false,
      renderText: (_, row) => row.app_name || row.app_public_id
    },
    {
      title: t("versions.app"),
      dataIndex: "app_id",
      hideInTable: true,
      valueType: "select",
      request: loadApps,
      fieldProps: { showSearch: true }
    },
    { title: t("versions.version"), dataIndex: "version", width: 110 },
    { title: t("versions.versionCode"), dataIndex: "version_code", width: 110, search: false },
    {
      title: t("versions.releaseNotes"),
      dataIndex: "release_notes",
      ellipsis: true,
      search: false,
      renderText: (text) => text || "-"
    },
    {
      title: t("versions.forcedUpdate"),
      dataIndex: "is_forced",
      width: 100,
      search: false,
      render: (_, row) =>
        row.is_forced === 1 ? <Tag color="red">{t("versions.forced")}</Tag> : <Tag>{t("versions.optional")}</Tag>
    },
    {
      title: t("versions.status"),
      dataIndex: "status",
      width: 100,
      valueEnum: getVersionStatusValueEnum(t),
      search: false
    },
    {
      title: t("versions.publishedAt"),
      dataIndex: "published_at",
      width: 170,
      search: false,
      renderText: (text) => (text ? formatDate(text) : "-")
    },
    { title: t("versions.createdAt"), dataIndex: "created_at", width: 170, search: false, renderText: formatDate },
    {
      title: t("common.action"),
      valueType: "option",
      width: 210,
      fixed: "right",
      render: (_, row) => (
        <Space size={4} wrap>
          {row.status === VERSION_STATUS.DRAFT && (
            <Button size="small" type="link" icon={<RocketOutlined />} onClick={() => publishVersion(row)}>
              {t("versions.publish")}
            </Button>
          )}
          {row.status === VERSION_STATUS.PUBLISHED && (
            <Button size="small" type="link" icon={<StopOutlined />} onClick={() => unpublishVersion(row)}>
              {t("versions.unpublish")}
            </Button>
          )}
          <Button
            size="small"
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingVersion(row);
              editForm.setFieldsValue({
                version: row.version,
                version_code: row.version_code,
                release_notes: row.release_notes || undefined,
                download_url: row.download_url || undefined,
                is_forced: row.is_forced === 1
              });
              setEditOpen(true);
            }}
          >
            {t("common.edit")}
          </Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => deleteVersion(row)}>
            {t("common.delete")}
          </Button>
        </Space>
      )
    }
  ];

  return (
    <>
      <ProTable<VersionItem>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        cardBordered
        bordered
        scroll={{ x: 1280 }}
        search={{ labelWidth: 72, defaultCollapsed: false }}
        options={{ density: true, fullScreen: true, reload: true, setting: true }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        request={async (params) => {
          try {
            const data = await apiRequest<ListResponse<VersionItem>>(
              `/api/admin/versions${toQuery({
                app_id: params.app_id as string | undefined,
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
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              createForm.resetFields();
              setCreateOpen(true);
            }}
          >
            {t("versions.create")}
          </Button>
        ]}
      />

      <Modal title={t("versions.create")} open={createOpen} footer={null} destroyOnHidden onCancel={() => setCreateOpen(false)}>
        <ProForm
          form={createForm}
          onFinish={async (values) => {
            try {
              await apiRequest("/api/admin/versions", {
                method: "POST",
                body: JSON.stringify({
                  app_id: values.app_id,
                  version: values.version,
                  version_code: Number(values.version_code),
                  release_notes: values.release_notes ?? "",
                  download_url: values.download_url,
                  is_forced: values.is_forced === true
                })
              });
              message.success(t("versions.createSucceeded"));
              setCreateOpen(false);
              actionRef.current?.reload();
            } catch (error) {
              message.error(error instanceof Error ? error.message : t("common.createFailed"));
            }
          }}
        >
          <ProFormSelect name="app_id" label={t("versions.app")} request={loadApps} rules={[{ required: true, message: t("versions.appRequired") }]} />
          <ProFormText name="version" label={t("versions.version")} rules={[{ required: true, message: t("versions.version") }]} placeholder="1.0.0" />
          <ProFormText
            name="version_code"
            label={t("versions.versionCode")}
            rules={[
              { required: true, message: t("versions.versionCodeHelp") },
              { pattern: /^\d+$/, message: t("versions.versionCodeHelp") }
            ]}
            fieldProps={{ inputMode: "numeric" }}
            help={t("versions.versionCodeHelp")}
          />
          <ProFormTextArea name="release_notes" label={t("versions.releaseNotes")} fieldProps={{ rows: 4 }} />
          <ProFormText name="download_url" label={t("versions.downloadUrl")} placeholder="https://..." />
          <ProFormSwitch name="is_forced" label={t("versions.forcedUpdate")} help={t("versions.forcedHelp")} />
        </ProForm>
      </Modal>

      <Modal title={t("versions.edit")} open={editOpen} footer={null} destroyOnHidden onCancel={() => setEditOpen(false)}>
        <ProForm
          form={editForm}
          onFinish={async (values) => {
            try {
              await apiRequest(`/api/admin/versions/${editingVersion?.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  version: values.version,
                  version_code: Number(values.version_code),
                  release_notes: values.release_notes ?? "",
                  download_url: values.download_url,
                  is_forced: values.is_forced === true
                })
              });
              message.success(t("versions.editSucceeded"));
              setEditOpen(false);
              actionRef.current?.reload();
            } catch (error) {
              message.error(error instanceof Error ? error.message : t("common.editFailed"));
            }
          }}
        >
          <ProFormText name="version" label={t("versions.version")} rules={[{ required: true, message: t("versions.version") }]} placeholder="1.0.0" />
          <ProFormText
            name="version_code"
            label={t("versions.versionCode")}
            rules={[
              { required: true, message: t("versions.versionCodeHelp") },
              { pattern: /^\d+$/, message: t("versions.versionCodeHelp") }
            ]}
            fieldProps={{ inputMode: "numeric" }}
            help={t("versions.versionCodeHelp")}
          />
          <ProFormTextArea name="release_notes" label={t("versions.releaseNotes")} fieldProps={{ rows: 4 }} />
          <ProFormText name="download_url" label={t("versions.downloadUrl")} placeholder="https://..." />
          <ProFormSwitch name="is_forced" label={t("versions.forcedUpdate")} help={t("versions.forcedHelp")} />
        </ProForm>
      </Modal>
    </>
  );
}
