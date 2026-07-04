import { App as AntApp, Form, Input, Modal } from "antd";
import { useState } from "react";
import { apiRequest } from "../api";
import { useI18n } from "../i18n";

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function ChangePasswordModal({ open, onClose, onChanged }: ChangePasswordModalProps) {
  const { message } = AntApp.useApp();
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={async (values) => {
        setLoading(true);
        try {
          await apiRequest("/api/admin/password", {
            method: "PATCH",
            body: JSON.stringify({
              current_password: values.current_password,
              new_password: values.new_password
            })
          });
          message.success(t("auth.passwordChanged"));
          form.resetFields();
          onChanged();
        } catch (error) {
          message.error(error instanceof Error ? error.message : t("auth.changeFailed"));
        } finally {
          setLoading(false);
        }
      }}
    >
      <Modal
        title={t("auth.changePassword")}
        open={open}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        confirmLoading={loading}
        onCancel={() => {
          form.resetFields();
          onClose();
        }}
        onOk={() => form.submit()}
      >
        <Form.Item name="current_password" label={t("auth.currentPassword")} rules={[{ required: true, message: t("auth.currentPasswordRequired") }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="new_password"
          label={t("auth.newPassword")}
          rules={[
            { required: true, message: t("auth.newPasswordRequired") },
            { min: 8, message: t("auth.newPasswordMin") }
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label={t("auth.confirmPassword")}
          dependencies={["new_password"]}
          rules={[
            { required: true, message: t("auth.confirmPasswordRequired") },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("new_password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t("auth.passwordMismatch")));
              }
            })
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Modal>
    </Form>
  );
}
