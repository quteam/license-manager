import { CopyOutlined, DownloadOutlined, FileMarkdownOutlined, ReadOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Alert, App as AntApp, Button, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

const PROMPT_URL = "/docs/INTEGRATION_PROMPT.md";
const API_URL = "/docs/API.md";
const VERSIONS_API_URL = "/docs/API_VERSIONS.md";

export function IntegrationPromptPage() {
  const { message } = AntApp.useApp();
  const { t } = useI18n();
  const [prompt, setPrompt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(PROMPT_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("load failed");
        }
        return response.text();
      })
      .then((text) => {
        if (!cancelled) {
          setPrompt(text);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrompt("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyPrompt = async () => {
    if (!prompt) {
      return;
    }
    await navigator.clipboard.writeText(prompt);
    message.success(t("prompt.copied"));
  };

  return (
    <Space direction="vertical" className="w-full" size="large">
      <ProCard title={t("prompt.title")}>
        <Space direction="vertical" className="w-full" size="middle">
          <Alert showIcon type="info" message={t("prompt.description")} />
          <Typography.Text strong>{t("prompt.intro")}</Typography.Text>
          <Typography.Paragraph type="secondary" className="mb-0">
            {t("prompt.introSteps")}
          </Typography.Paragraph>
          <Space wrap>
            <Button type="primary" icon={<CopyOutlined />} disabled={!prompt} onClick={copyPrompt}>
              {t("prompt.copy")}
            </Button>
            <Button icon={<DownloadOutlined />} href={PROMPT_URL} download="软件卡密验证系统接入AI提示词.md">
              {t("prompt.downloadPrompt")}
            </Button>
            <Button icon={<FileMarkdownOutlined />} href={API_URL} download="API.md">
              {t("prompt.downloadApi")}
            </Button>
            <Button icon={<ReadOutlined />} href={VERSIONS_API_URL} download="API_VERSIONS.md">
              {t("prompt.downloadVersionsApi")}
            </Button>
          </Space>
        </Space>
      </ProCard>

      <ProCard title={t("prompt.title")}>
        {prompt === null ? (
          <Typography.Text type="secondary">{t("prompt.loading")}</Typography.Text>
        ) : prompt ? (
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed">
            {prompt}
          </pre>
        ) : (
          <Typography.Text type="danger">{t("prompt.loadFailed")}</Typography.Text>
        )}
      </ProCard>
    </Space>
  );
}
