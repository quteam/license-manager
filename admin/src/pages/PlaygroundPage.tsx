import { PlayCircleOutlined } from "@ant-design/icons";
import { ProCard, ProForm, ProFormDependency, ProFormSelect, ProFormText } from "@ant-design/pro-components";
import { Alert, App as AntApp, Form, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useCatalogs } from "../hooks/useCatalogs";
import { formatAppOptionLabel } from "../shared/appPlatform";
import { CodeBlock } from "../shared/CodeBlock";
import {
  createRequestPayload,
  getClientActions,
  getClientPath,
  type ClientAction
} from "../shared/licenseDocs";
import { useI18n } from "../i18n";
import type { ApiResponse } from "../types";

type PlaygroundValues = {
  action: ClientAction;
  app_id: string;
  app_secret: string;
  code?: string;
  device_fingerprint?: string;
};

export function PlaygroundPage() {
  const { message } = AntApp.useApp();
  const { t } = useI18n();
  const { apps } = useCatalogs();
  const [playgroundForm] = Form.useForm<PlaygroundValues>();
  const [selectedAppId, setSelectedAppId] = useState<string>(() => apps[0]?.app_id ?? "app_xxx");
  const [selectedAction, setSelectedAction] = useState<ClientAction>("activate");
  const [playgroundResult, setPlaygroundResult] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const apiBaseUrl = window.location.origin;
  const clientActions = useMemo(() => getClientActions(t), [t]);
  const selectedActionMeta = clientActions.find((action) => action.value === selectedAction) ?? clientActions[0];
  const requestPayload = useMemo(() => createRequestPayload(selectedAction, selectedAppId, t), [selectedAction, selectedAppId, t]);

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
          <Alert showIcon type="info" message={t("playground.warning")} />
          <ProForm<PlaygroundValues>
            form={playgroundForm}
            layout="vertical"
            submitter={{
              searchConfig: { submitText: t("common.send") },
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
                  message.success(t("common.requestSucceeded"));
                } else {
                  message.error(data.error.message || data.error.code);
                }
                return data.ok;
              } catch (error) {
                const text = error instanceof Error ? error.message : t("common.requestFailed");
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
              label={t("playground.action")}
              options={clientActions.map((action) => ({ value: action.value, label: `${action.label} ${action.path}` }))}
              rules={[{ required: true, message: t("playground.actionRequired") }]}
            />
            <ProFormSelect
              name="app_id"
              label={t("common.app")}
              options={apps.map((app) => ({ value: app.app_id, label: formatAppOptionLabel(app, t) }))}
              rules={[{ required: true, message: t("playground.appRequired") }]}
            />
            <ProFormText.Password
              name="app_secret"
              label={t("playground.appSecret")}
              fieldProps={{ autoComplete: "off" }}
              rules={[{ required: true, message: t("playground.appSecretRequired") }]}
            />
            <ProFormDependency name={["action"]}>
              {({ action }) => action === "app-info" ? null : (
                <>
                  <ProFormText name="code" label={t("playground.code")} rules={[{ required: true, message: t("playground.codeRequired") }]} />
                  <ProFormText
                    name="device_fingerprint"
                    label={action === "unbind" ? t("playground.currentDeviceFingerprint") : t("playground.deviceFingerprint")}
                    rules={[{ required: true, message: t("playground.deviceFingerprintRequired") }]}
                  />
                </>
              )}
            </ProFormDependency>
          </ProForm>
        </Space>
      </ProCard>

      <Space direction="vertical" className="w-full" size="large">
        <ProCard
          title={t("playground.requestPreview")}
          extra={
            <Typography.Text type="secondary" copyable={{ text: `${apiBaseUrl}${selectedActionMeta.path}` }}>
              {selectedActionMeta.path}
            </Typography.Text>
          }
        >
          <CodeBlock value={requestPayload} title="JSON Body" language="json" />
        </ProCard>

        <ProCard title={t("playground.responseResult")}>
          <CodeBlock
            value={playgroundResult || t("playground.emptyResult")}
            title={t("playground.responseJson")}
            language={playgroundResult ? "json" : "javascript"}
            copyText={playgroundResult || ""}
          />
        </ProCard>
      </Space>
    </div>
  );
}

function buildPlaygroundBody(values: PlaygroundValues) {
  const body: Record<string, string> = {
    app_id: values.app_id,
    app_secret: values.app_secret
  };
  if (values.action !== "app-info") {
    body.code = values.code ?? "";
    body.device_fingerprint = values.device_fingerprint ?? "";
  }
  return body;
}
