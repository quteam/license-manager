import { CopyOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard, ProForm, ProFormDigit, ProFormSelect, ProFormTextArea } from "@ant-design/pro-components";
import { App as AntApp, Button, Input } from "antd";
import { useMemo, useState } from "react";
import { apiRequest } from "../api";
import { useCatalogs } from "../hooks/useCatalogs";
import { formatAppOptionLabel } from "../shared/appPlatform";
import { useI18n } from "../i18n";
import { MAX_CODE_BATCH_QUANTITY } from "../shared/constants";
import { normalizeParams } from "../shared/params";
import { formatPlanLabel } from "../shared/plan";

export function GeneratePage() {
  const { message } = AntApp.useApp();
  const { t } = useI18n();
  const { apps, plans } = useCatalogs();
  const [codes, setCodes] = useState<string[]>([]);
  const csv = useMemo(() => codes.join("\n"), [codes]);

  return (
    <div className="grid grid-cols-1 items-start gap-6 min-[961px]:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <ProCard title={t("generate.params")}>
        <ProForm
          layout="vertical"
          submitter={{
            searchConfig: { submitText: t("common.generated") },
            submitButtonProps: { icon: <PlusOutlined /> },
            resetButtonProps: false
          }}
          initialValues={{ quantity: 10 }}
          onFinish={async (values) => {
            try {
              const data = await apiRequest<{ codes: string[]; batch_id: number }>("/api/admin/codes/batch", {
                method: "POST",
                body: JSON.stringify(normalizeParams(values))
              });
              setCodes(data.codes);
              message.success(t("generate.generatedCodes", { count: data.codes.length }));
              return true;
            } catch (error) {
              message.error(error instanceof Error ? error.message : t("generate.failed"));
              return false;
            }
          }}
        >
          <ProFormSelect
            name="app_id"
            label={t("common.app")}
            options={apps.map((app) => ({ value: app.app_id, label: formatAppOptionLabel(app, t) }))}
            rules={[{ required: true, message: t("generate.appRequired") }]}
          />
          <ProFormSelect
            name="plan_code"
            label={t("common.plan")}
            options={plans.map((plan) => ({ value: plan.code, label: formatPlanLabel(plan, t) }))}
            rules={[{ required: true, message: t("generate.planRequired") }]}
          />
          <ProFormDigit
            name="quantity"
            label={t("common.quantity")}
            min={1}
            max={MAX_CODE_BATCH_QUANTITY}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true, message: t("generate.quantityRequired") }]}
          />
          <ProFormTextArea name="note" label={t("common.note")} fieldProps={{ rows: 3, maxLength: 120, showCount: true }} />
        </ProForm>
      </ProCard>
      <ProCard
        title={t("generate.result")}
        extra={
          <Button
            icon={<CopyOutlined />}
            disabled={codes.length === 0}
            onClick={async () => {
              await navigator.clipboard.writeText(csv);
              message.success(t("common.copied"));
            }}
          >
            {t("common.copy")}
          </Button>
        }
      >
        <Input.TextArea value={csv} readOnly rows={18} placeholder={t("generate.placeholder")} />
      </ProCard>
    </div>
  );
}
