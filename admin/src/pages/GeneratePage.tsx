import { CopyOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard, ProForm, ProFormDigit, ProFormSelect, ProFormTextArea } from "@ant-design/pro-components";
import { App as AntApp, Button, Input } from "antd";
import { useMemo, useState } from "react";
import { apiRequest } from "../api";
import { useCatalogs } from "../hooks/useCatalogs";
import { formatAppOptionLabel } from "../shared/appPlatform";
import { MAX_CODE_BATCH_QUANTITY } from "../shared/constants";
import { normalizeParams } from "../shared/params";
import { formatPlanLabel } from "../shared/plan";

export function GeneratePage() {
  const { message } = AntApp.useApp();
  const { apps, plans } = useCatalogs();
  const [codes, setCodes] = useState<string[]>([]);
  const csv = useMemo(() => codes.join("\n"), [codes]);

  return (
    <div className="grid grid-cols-1 items-start gap-6 min-[961px]:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <ProCard title="生成参数">
        <ProForm
          layout="vertical"
          submitter={{
            searchConfig: { submitText: "生成" },
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
              message.success(`已生成 ${data.codes.length} 个激活码`);
              return true;
            } catch (error) {
              message.error(error instanceof Error ? error.message : "生成失败");
              return false;
            }
          }}
        >
          <ProFormSelect
            name="app_id"
            label="应用"
            options={apps.map((app) => ({ value: app.app_id, label: formatAppOptionLabel(app) }))}
            rules={[{ required: true, message: "请选择应用" }]}
          />
          <ProFormSelect
            name="plan_code"
            label="套餐"
            options={plans.map((plan) => ({ value: plan.code, label: formatPlanLabel(plan) }))}
            rules={[{ required: true, message: "请选择套餐" }]}
          />
          <ProFormDigit
            name="quantity"
            label="数量"
            min={1}
            max={MAX_CODE_BATCH_QUANTITY}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true, message: "请输入数量" }]}
          />
          <ProFormTextArea name="note" label="备注" fieldProps={{ rows: 3, maxLength: 120, showCount: true }} />
        </ProForm>
      </ProCard>
      <ProCard
        title="生成结果"
        extra={
          <Button
            icon={<CopyOutlined />}
            disabled={codes.length === 0}
            onClick={async () => {
              await navigator.clipboard.writeText(csv);
              message.success("已复制");
            }}
          >
            复制
          </Button>
        }
      >
        <Input.TextArea value={csv} readOnly rows={18} placeholder="生成后明文激活码只在这里显示" />
      </ProCard>
    </div>
  );
}
