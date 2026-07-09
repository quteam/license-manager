import { DownloadOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Alert, App as AntApp, Button, Descriptions, Select, Space, Tabs, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { usePageTitleExtra } from "../components/PageTitleExtraContext";
import { useCatalogs } from "../hooks/useCatalogs";
import { useI18n } from "../i18n";
import { formatAppOptionLabel } from "../shared/appPlatform";
import { CodeBlock } from "../shared/CodeBlock";
import { createLicenseSdkEntries, type LicenseSdkEntry } from "../shared/licenseSdks";

export function SdkPage() {
  const { t } = useI18n();
  const { message } = AntApp.useApp();
  const { apps } = useCatalogs();
  const setPageTitleExtra = usePageTitleExtra();
  const [selectedAppId, setSelectedAppId] = useState<string>(() => apps[0]?.app_id ?? "app_xxx");
  const apiBaseUrl = window.location.origin;
  const appOptions = useMemo(() => apps.map((app) => ({ value: app.app_id, label: formatAppOptionLabel(app, t) })), [apps, t]);
  const sdkEntries = useMemo(() => createLicenseSdkEntries(selectedAppId, apiBaseUrl, t), [apiBaseUrl, selectedAppId, t]);

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
      <Alert showIcon type="warning" message={t("sdk.secretWarning")} />

      <ProCard title={t("sdk.config")}>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label={t("docs.apiBaseUrl")}>
            <Typography.Text code className="select-all break-all">
              {apiBaseUrl}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label={t("apps.appId")}>
            <Typography.Text code className="select-all break-all">
              {selectedAppId}
            </Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      </ProCard>

      <ProCard title={t("sdk.components")}>
        <Tabs
          items={sdkEntries.map((entry) => ({
            key: entry.key,
            label: entry.name,
            children: (
              <SdkEntryPanel
                entry={entry}
                onDownloaded={() => message.success(t("sdk.downloaded"))}
                onDownloadFailed={() => message.error(t("sdk.downloadFailed"))}
              />
            )
          }))}
        />
      </ProCard>
    </Space>
  );
}

function SdkEntryPanel({
  entry,
  onDownloaded,
  onDownloadFailed
}: {
  entry: LicenseSdkEntry;
  onDownloaded: () => void;
  onDownloadFailed: () => void;
}) {
  const { t } = useI18n();

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Typography.Paragraph type="secondary" className="mb-2">
            {entry.description}
          </Typography.Paragraph>
          <Typography.Text type="secondary">{t("sdk.filename")}: </Typography.Text>
          <Typography.Text code className="select-all break-all">
            {entry.filename}
          </Typography.Text>
        </div>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            try {
              downloadSdkEntry(entry);
              onDownloaded();
            } catch {
              onDownloadFailed();
            }
          }}
        >
          {t("sdk.download")}
        </Button>
      </div>
      <CodeBlock value={entry.code} title={entry.filename} language={entry.language} />
    </Space>
  );
}

function downloadSdkEntry(entry: LicenseSdkEntry) {
  const blob = new Blob([entry.code], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = entry.filename;
  document.body.append(link);
  link.click();
  link.remove();
  revokeObjectUrl(url);
}

function revokeObjectUrl(url: string) {
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
