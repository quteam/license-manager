import {
  ApiOutlined,
  CopyOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  PlayCircleOutlined
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Alert, App as AntApp, Button, Descriptions, Select, Space, Steps, Tabs, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useCatalogs } from "../hooks/useCatalogs";
import { formatAppOptionLabel } from "../shared/appPlatform";
import { CodeBlock } from "../shared/CodeBlock";
import {
  type ClientFlowStep,
  clientActions,
  clientActionFlows,
  createCurlDemo,
  createHtmlDemo,
  createJavaScriptDemo,
  createRequestPayload,
  responseExample
} from "../shared/licenseDocs";

export function DocsPage() {
  const { apps } = useCatalogs();
  const [selectedAppId, setSelectedAppId] = useState<string>(() => apps[0]?.app_id ?? "app_xxx");
  const apiBaseUrl = window.location.origin;
  const selectedApp = apps.find((app) => app.app_id === selectedAppId);
  const jsDemo = useMemo(() => createJavaScriptDemo(selectedAppId, apiBaseUrl), [apiBaseUrl, selectedAppId]);
  const curlDemo = useMemo(() => createCurlDemo("activate", selectedAppId, apiBaseUrl), [apiBaseUrl, selectedAppId]);
  const htmlDemo = useMemo(() => createHtmlDemo(selectedAppId, apiBaseUrl), [apiBaseUrl, selectedAppId]);

  useEffect(() => {
    if (selectedAppId === "app_xxx" && apps[0]) {
      setSelectedAppId(apps[0].app_id);
    }
  }, [apps, selectedAppId]);

  return (
    <Space direction="vertical" className="w-full" size="large">
      <ProCard
        title="客户端接入"
        extra={
          selectedApp ? (
            <Tag color="blue" className="mr-0">
              {selectedApp.name}
            </Tag>
          ) : null
        }
      >
        <Space direction="vertical" className="w-full" size="middle">
          <Alert
            showIcon
            type="warning"
            message="app_secret 只在创建应用或更换密钥时显示一次，本页不会持久化或回显密钥。"
          />
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="API 基础地址">
              <CopyableInline value={apiBaseUrl} label="API 基础地址" />
            </Descriptions.Item>
            <Descriptions.Item label="应用 ID">
              <Space wrap>
                <CopyableInline value={selectedAppId} label="应用 ID" />
                <Select
                  value={selectedAppId}
                  options={apps.map((app) => ({ value: app.app_id, label: formatAppOptionLabel(app) }))}
                  popupMatchSelectWidth={false}
                  className="min-w-56"
                  onChange={setSelectedAppId}
                />
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="请求格式">JSON，统一使用 POST 和 Content-Type: application/json</Descriptions.Item>
            <Descriptions.Item label="响应格式">成功返回 ok/data，失败返回 ok/error.code/error.message</Descriptions.Item>
          </Descriptions>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StepCard title="1. 保存凭据" text="在客户端配置 app_id 和 app_secret，密钥不要写入公开仓库。" />
            <StepCard title="2. 生成设备指纹" text="使用稳定设备标识，后端只保存 HMAC 后的设备哈希。" />
            <StepCard title="3. 调用授权接口" text="首次激活调用 activate，后续启动调用 verify，迁移前旧设备调用 unbind-device。" />
          </div>
        </Space>
      </ProCard>

      <ProCard title="API 调用方法">
        <Tabs
          items={clientActions.map((action) => ({
            key: action.value,
            label: action.label,
            children: (
              <Space direction="vertical" className="w-full" size="middle">
                <Typography.Text type="secondary">{action.description}</Typography.Text>
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="地址">
                    <Typography.Text code>POST {action.path}</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="公共参数">app_id、app_secret、code</Descriptions.Item>
                  <Descriptions.Item label="设备参数">device_fingerprint</Descriptions.Item>
                </Descriptions>
                <FlowChart steps={clientActionFlows[action.value]} />
                <CodeBlock value={createRequestPayload(action.value, selectedAppId)} title="请求示例" language="json" />
              </Space>
            )
          }))}
        />
      </ProCard>

      <ProCard title="现成 demo">
        <Tabs
          items={[
            {
              key: "javascript",
              label: "JavaScript SDK",
              icon: <FileTextOutlined />,
              children: <CodeBlock value={jsDemo} title="可直接放入客户端项目的封装" language="javascript" />
            },
            {
              key: "curl",
              label: "cURL",
              icon: <ApiOutlined />,
              children: <CodeBlock value={curlDemo} title="命令行调试" language="shell" />
            },
            {
              key: "html",
              label: "HTML Demo",
              icon: <PlayCircleOutlined />,
              children: <CodeBlock value={htmlDemo} title="单文件浏览器 demo" language="html" />
            },
            {
              key: "response",
              label: "响应示例",
              icon: <ExperimentOutlined />,
              children: <CodeBlock value={responseExample} title="成功响应" language="json" />
            }
          ]}
        />
      </ProCard>
    </Space>
  );
}

function FlowChart({ steps }: { steps: ClientFlowStep[] }) {
  return (
    <div>
      <Typography.Text type="secondary">调用流程</Typography.Text>
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

  return (
    <Space size={4}>
      <Typography.Text code className="select-all break-all">
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
