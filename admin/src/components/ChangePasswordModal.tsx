import { App as AntApp, Form, Input, Modal } from "antd";
import { useState } from "react";
import { apiRequest } from "../api";

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function ChangePasswordModal({ open, onClose, onChanged }: ChangePasswordModalProps) {
  const { message } = AntApp.useApp();
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
          message.success("密码已修改，请重新登录");
          form.resetFields();
          onChanged();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "修改失败");
        } finally {
          setLoading(false);
        }
      }}
    >
      <Modal
        title="修改密码"
        open={open}
        okText="保存"
        cancelText="取消"
        confirmLoading={loading}
        onCancel={() => {
          form.resetFields();
          onClose();
        }}
        onOk={() => form.submit()}
      >
        <Form.Item name="current_password" label="当前密码" rules={[{ required: true, message: "请输入当前密码" }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="新密码"
          rules={[
            { required: true, message: "请输入新密码" },
            { min: 8, message: "新密码至少 8 位" }
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="确认新密码"
          dependencies={["new_password"]}
          rules={[
            { required: true, message: "请再次输入新密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("new_password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("两次输入的新密码不一致"));
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
