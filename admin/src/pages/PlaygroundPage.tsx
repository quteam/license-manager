import { PlayCircleOutlined } from "@ant-design/icons";
import { ProCard, ProForm, ProFormDependency, ProFormSelect, ProFormText } from "@ant-design/pro-components";
import { Alert, App as AntApp, Form, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useCatalogs } from "../hooks/useCatalogs";
import { formatAppOptionLabel } from "../shared/appPlatform";
import { CodeBlock } from "../shared/CodeBlock";
import {
  clientActions,
  createRequestPayload,
  getClientPath,
  type ClientAction
} from "../shared/licenseDocs";
import type { ApiResponse } from "../types";

type PlaygroundValues = {
  action: ClientAction;
  app_id: string;
  app_secret: string;
  code: string;
  device_fingerprint?: string;
};

export function PlaygroundPage() {
  const { message } = AntApp.useApp();
  const { apps } = useCatalogs();
  const [playgroundForm] = Form.useForm<PlaygroundValues>();
  const [selectedAppId, setSelectedAppId] = useState<string>(() => apps[0]?.app_id ?? "app_xxx");
  const [selectedAction, setSelectedAction] = useState<ClientAction>("activate");
  const [playgroundResult, setPlaygroundResult] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const apiBaseUrl = window.location.origin;
  const selectedActionMeta = clientActions.find((action) => action.value === selectedAction) ?? clientActions[0];
  const requestPayload = useMemo(() => createRequestPayload(selectedAction, selectedAppId), [selectedAction, selectedAppId]);

  useEffect(() => {
    if (selectedAppId === "app_xxx" && apps[0]) {
      setSelectedAppId(apps[0].app_id);
      playgroundForm.setFieldValue("app_id", apps[0].app_id);
    }
  }, [apps, playgroundForm, selectedAppId]);

  return (
    <div className="grid grid-cols-1 items-start gap-6 min-[1180px]:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
      <ProCard title="Playground">
        <Space direction="vertical" className="w-full" size="middle">
          <Alert showIcon type="info" message="在线调用真实客户端接口，会写入操作日志；激活接口会绑定激活码和设备，解绑接口会清除当前绑定。" />
          <ProForm<PlaygroundValues>
            form={playgroundForm}
            layout="vertical"
            submitter={{
              searchConfig: { submitText: "发送请求" },
              submitButtonProps: { icon: <PlayCircleOutlined />, loading: submitting },
              resetButtonProps: false
            }}
            initialValues={{
              action: "activate",
              app_id: selectedAppId,
              device_fingerprint: "demo-device-001"
            }}
            onValuesChange={(changed) => {
              if (typeof changed.action === "string") {
                setSelectedAction(changed.action as ClientAction);
              }
              if (typeof changed.app_id === "string") {
                setSelectedAppId(changed.app_id);
              }
            }}
            onFinish={async (values) => {
              setSubmitting(true);
              try {
                const payload = buildPlaygroundBody(values);
                const response = await fetch(getClientPath(values.action), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
                });
                const data = (await response.json()) as ApiResponse<unknown>;
                setPlaygroundResult(JSON.stringify(data, null, 2));
                if (data.ok) {
                  message.success("请求成功");
                } else {
                  message.error(data.error.message || data.error.code);
                }
                return data.ok;
              } catch (error) {
                const text = error instanceof Error ? error.message : "请求失败";
                setPlaygroundResult(JSON.stringify({ ok: false, error: { message: text } }, null, 2));
                message.error(text);
                return false;
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <ProFormSelect
              name="action"
              label="接口"
              options={clientActions.map((action) => ({ value: action.value, label: `${action.label} ${action.path}` }))}
              rules={[{ required: true, message: "请选择接口" }]}
            />
            <ProFormSelect
              name="app_id"
              label="应用"
              options={apps.map((app) => ({ value: app.app_id, label: formatAppOptionLabel(app) }))}
              rules={[{ required: true, message: "请选择应用" }]}
            />
            <ProFormText.Password
              name="app_secret"
              label="应用密钥"
              fieldProps={{ autoComplete: "off" }}
              rules={[{ required: true, message: "请输入应用密钥" }]}
            />
            <ProFormText name="code" label="激活码" rules={[{ required: true, message: "请输入激活码" }]} />
            <ProFormDependency name={["action"]}>
              {({ action }) =>
                <ProFormText
                  name="device_fingerprint"
                  label={action === "unbind" ? "当前设备指纹" : "设备指纹"}
                  rules={[{ required: true, message: "请输入设备指纹" }]}
                />
              }
            </ProFormDependency>
          </ProForm>
        </Space>
      </ProCard>

      <Space direction="vertical" className="w-full" size="large">
        <ProCard
          title="请求预览"
          extra={
            <Typography.Text type="secondary" copyable={{ text: `${apiBaseUrl}${selectedActionMeta.path}` }}>
              {selectedActionMeta.path}
            </Typography.Text>
          }
        >
          <CodeBlock value={requestPayload} title="JSON Body" language="json" />
        </ProCard>

        <ProCard title="返回结果">
          <CodeBlock
            value={playgroundResult || "// 发送请求后显示完整 JSON 响应"}
            title="响应 JSON"
            language={playgroundResult ? "json" : "javascript"}
            copyText={playgroundResult || ""}
          />
        </ProCard>
      </Space>
    </div>
  );
}

function buildPlaygroundBody(values: PlaygroundValues) {
  return {
    app_id: values.app_id,
    app_secret: values.app_secret,
    code: values.code,
    device_fingerprint: values.device_fingerprint
  };
}
