import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { App as AntApp, Form, Input, Modal } from "antd";
import { useState } from "react";
import { apiRequest } from "../api";
import { useI18n } from "../i18n";

type ResetPasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

type ResetPasswordValues = {
  username: string;
  recovery_password: string;
  new_password: string;
  confirm_password: string;
};

export function ResetPasswordModal({ open, onClose }: ResetPasswordModalProps) {
  const [form] = Form.useForm<ResetPasswordValues>();
  const { message } = AntApp.useApp();
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal
      title={t("auth.resetPassword")}
      open={open}
      okText={t("auth.resetPassword")}
      cancelText={t("common.cancel")}
      confirmLoading={submitting}
      destroyOnHidden
      onCancel={() => {
        if (submitting) {
          return;
        }
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          setSubmitting(true);
          try {
            await apiRequest("/api/recovery/admin-password", {
              method: "POST",
              body: JSON.stringify({
                username: values.username,
                recovery_password: values.recovery_password,
                new_password: values.new_password
              })
            });
            message.success(t("auth.passwordReset"));
            form.resetFields();
            onClose();
          } catch (error) {
            message.error(error instanceof Error ? error.message : t("auth.resetFailed"));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Form.Item name="username" label={t("auth.username")} rules={[{ required: true, message: t("auth.usernameRequired") }]}>
          <Input autoComplete="username" prefix={<UserOutlined />} placeholder={t("auth.usernamePlaceholder")} />
        </Form.Item>
        <Form.Item
          name="recovery_password"
          label={t("auth.recoveryPassword")}
          rules={[{ required: true, message: t("auth.recoveryPasswordRequired") }]}
        >
          <Input.Password
            autoComplete="one-time-code"
            prefix={<SafetyCertificateOutlined />}
            placeholder={t("auth.recoveryPasswordPlaceholder")}
          />
        </Form.Item>
        <Form.Item
          name="new_password"
          label={t("auth.newPassword")}
          rules={[
            { required: true, message: t("auth.newPasswordRequired") },
            { min: 8, message: t("auth.newPasswordMin") }
          ]}
        >
          <Input.Password autoComplete="new-password" prefix={<LockOutlined />} placeholder={t("auth.newPasswordPlaceholder")} />
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
          <Input.Password autoComplete="new-password" prefix={<LockOutlined />} placeholder={t("auth.confirmPasswordPlaceholder")} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
