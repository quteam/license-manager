import {
  ApiOutlined,
  CopyOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  PlayCircleOutlined
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Alert, App as AntApp, Button, Descriptions, Select, Space, Steps, Tabs, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { usePageTitleExtra } from "../components/PageTitleExtraContext";
import { useCatalogs } from "../hooks/useCatalogs";
import { useI18n } from "../i18n";
import { formatAppOptionLabel } from "../shared/appPlatform";
import { CodeBlock } from "../shared/CodeBlock";
import {
  type ClientFlowStep,
  createCurlDemo,
  createHtmlDemo,
  createJavaScriptDemo,
  createRequestPayload,
  createResponseExample,
  createTypeScriptDemo,
  getClientActionFlows,
  getClientActions
} from "../shared/licenseDocs";

export function DocsPage() {
  const { t } = useI18n();
  const { apps } = useCatalogs();
  const setPageTitleExtra = usePageTitleExtra();
  const [selectedAppId, setSelectedAppId] = useState<string>(() => apps[0]?.app_id ?? "app_xxx");
  const apiBaseUrl = window.location.origin;
  const appOptions = useMemo(() => apps.map((app) => ({ value: app.app_id, label: formatAppOptionLabel(app, t) })), [apps, t]);
  const clientActions = useMemo(() => getClientActions(t), [t]);
  const clientActionFlows = useMemo(() => getClientActionFlows(t), [t]);
  const tsDemo = useMemo(() => createTypeScriptDemo(selectedAppId, apiBaseUrl, t), [apiBaseUrl, selectedAppId, t]);
  const jsDemo = useMemo(() => createJavaScriptDemo(selectedAppId, apiBaseUrl, t), [apiBaseUrl, selectedAppId, t]);
  const curlDemo = useMemo(() => createCurlDemo("activate", selectedAppId, apiBaseUrl, t), [apiBaseUrl, selectedAppId, t]);
  const htmlDemo = useMemo(() => createHtmlDemo(selectedAppId, apiBaseUrl, t), [apiBaseUrl, selectedAppId, t]);
  const responseExample = useMemo(() => createResponseExample(t), [t]);

  useEffect(() => {
    if (selectedAppId === "app_xxx" && apps[0]) {
      setSelectedAppId(apps[0].app_id);
    }
  }, [apps, selectedAppId]);

  const appSelect = useMemo(
    () => (
      <Select
        aria-label={t("common.app")}
        value={selectedAppId}
        options={appOptions}
        popupMatchSelectWidth={false}
        className="min-w-56"
        onChange={setSelectedAppId}
      />
    ),
    [appOptions, selectedAppId, t]
  );

  useEffect(() => {
    setPageTitleExtra?.(appSelect);
    return () => {
      setPageTitleExtra?.(null);
    };
  }, [appSelect, setPageTitleExtra]);

  return (
    <Space direction="vertical" className="w-full" size="large">
      <ProCard title={t("docs.clientAccess")}>
        <Space direction="vertical" className="w-full" size="middle">
          <Alert
            showIcon
            type="warning"
            message={t("docs.secretWarning")}
          />
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label={t("docs.apiBaseUrl")}>
              <CopyableInline value={apiBaseUrl} label={t("docs.apiBaseUrl")} />
            </Descriptions.Item>
            <Descriptions.Item label={t("apps.appId")}>
              <CopyableInline value={selectedAppId} label={t("apps.appId")} />
            </Descriptions.Item>
            <Descriptions.Item label={t("docs.requestFormat")}>{t("docs.requestFormatValue")}</Descriptions.Item>
            <Descriptions.Item label={t("docs.responseFormat")}>{t("docs.responseFormatValue")}</Descriptions.Item>
          </Descriptions>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StepCard title={t("docs.stepCredentialsTitle")} text={t("docs.stepCredentialsText")} />
            <StepCard title={t("docs.stepFingerprintTitle")} text={t("docs.stepFingerprintText")} />
            <StepCard title={t("docs.stepCallTitle")} text={t("docs.stepCallText")} />
          </div>
        </Space>
      </ProCard>

      <ProCard title={t("docs.apiMethods")}>
        <Tabs
          items={clientActions.map((action) => ({
            key: action.value,
            label: action.label,
            children: (
              <Space direction="vertical" className="w-full" size="middle">
                <Typography.Text type="secondary">{action.description}</Typography.Text>
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label={t("docs.address")}>
                    <Typography.Text code>POST {action.path}</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={t("docs.commonParams")}>
                    {action.value === "app-info" ? "app_id, app_secret" : "app_id, app_secret, code"}
                  </Descriptions.Item>
                  <Descriptions.Item label={t("docs.deviceParams")}>
                    {action.value === "app-info" ? t("docs.noDeviceParams") : "device_fingerprint"}
                  </Descriptions.Item>
                </Descriptions>
                <FlowChart steps={clientActionFlows[action.value]} />
                <CodeBlock value={createRequestPayload(action.value, selectedAppId, t)} title={t("docs.requestExample")} language="json" />
              </Space>
            )
          }))}
        />
      </ProCard>

      <ProCard title={t("docs.demos")}>
        <Tabs
          items={[
            {
              key: "typescript",
              label: "TypeScript SDK",
              icon: <FileTextOutlined />,
              children: <CodeBlock value={tsDemo} title={t("docs.tsSdkTitle")} language="typescript" />
            },
            {
              key: "javascript",
              label: "JavaScript SDK",
              icon: <FileTextOutlined />,
              children: <CodeBlock value={jsDemo} title={t("docs.jsDemoTitle")} language="javascript" />
            },
            {
              key: "curl",
              label: "cURL",
              icon: <ApiOutlined />,
              children: <CodeBlock value={curlDemo} title={t("docs.curlTitle")} language="shell" />
            },
            {
              key: "html",
              label: "HTML Demo",
              icon: <PlayCircleOutlined />,
              children: <CodeBlock value={htmlDemo} title={t("docs.htmlTitle")} language="html" />
            },
            {
              key: "response",
              label: t("docs.responseExample"),
              icon: <ExperimentOutlined />,
              children: <CodeBlock value={responseExample} title={t("docs.successResponse")} language="json" />
            }
          ]}
        />
      </ProCard>
    </Space>
  );
}

function FlowChart({ steps }: { steps: ClientFlowStep[] }) {
  const { t } = useI18n();

  return (
    <div>
      <Typography.Text type="secondary">{t("docs.flow")}</Typography.Text>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 mt-2">
        <Steps
          size="small"
          current={steps.length}
          responsive
          className="[&_.ant-steps-item]:!basis-0 [&_.ant-steps-item]:!flex-1 [&_.ant-steps-item]:min-w-0"
          items={steps.map((step, index) => ({
            title: step.title,
            description: step.detail,
            icon: <span className="ant-steps-icon">{index + 1}</span>,
          }))}
        />
      </div>
    </div>
  );
}

function StepCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <Typography.Text strong>{title}</Typography.Text>
      <Typography.Paragraph type="secondary" className="mb-0 mt-2 text-sm">
        {text}
      </Typography.Paragraph>
    </div>
  );
}

function CopyableInline({ value, label }: { value: string; label: string }) {
  const { message } = AntApp.useApp();
  const { t } = useI18n();

  return (
    <Space size={4}>
      <Typography.Text code className="select-all break-all">
        {value}
      </Typography.Text>
      <Button
        size="small"
        type="text"
        icon={<CopyOutlined />}
        aria-label={t("common.copy")}
        title={t("common.copy")}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          message.success(t("common.copiedLabel", { label }));
        }}
      />
    </Space>
  );
}
