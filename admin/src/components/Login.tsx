import { LockOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { ProForm, ProFormText } from "@ant-design/pro-components";
import { App as AntApp, Button } from "antd";
import { useState } from "react";
import { apiRequest } from "../api";
import logoUrl from "../assets/logo.webp";
import { useI18n } from "../i18n";
import type { AdminUser } from "../types";
import { LanguageDropdown } from "./LanguageDropdown";
import { ResetPasswordModal } from "./ResetPasswordModal";

type LoginProps = {
  onLogin: (token: string, admin: AdminUser) => void;
};

export function Login({ onLogin }: LoginProps) {
  const { message } = AntApp.useApp();
  const { t } = useI18n();
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f5f7fb] px-4 py-10 pt-[20vh]">
      <div className="absolute right-4 top-4">
        <LanguageDropdown />
      </div>
      <section className="w-full max-w-[400px] rounded-lg border border-[#e5e7eb] bg-white px-6 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:px-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-[#eef4ff]">
            <img alt={t("app.title")} className="size-9 object-contain" src={logoUrl} />
          </div>
          <h1 className="m-0 text-2xl font-semibold leading-8 text-[#111827]">{t("app.title")}</h1>
          <p className="mb-0 mt-2 text-sm text-[#6b7280]">{t("app.subtitle")}</p>
        </div>

        <ProForm
          isKeyPressSubmit
          submitter={{
            searchConfig: { submitText: t("common.login") },
            submitButtonProps: { size: "large", style: { width: "100%" } },
            render: (_, dom) => dom.pop()
          }}
          onFinish={async (values) => {
            try {
              const data = await apiRequest<{ token: string; admin: AdminUser }>("/api/admin/login", {
                method: "POST",
                body: JSON.stringify(values)
              });
              onLogin(data.token, data.admin);
              return true;
            } catch (error) {
              message.error(error instanceof Error ? error.message : t("auth.loginFailed"));
              return false;
            }
          }}
        >
          <ProFormText
            name="tenant"
            fieldProps={{ autoComplete: "organization", prefix: <TeamOutlined />, size: "large" }}
            placeholder={t("auth.tenantPlaceholder")}
            rules={[{ required: true, message: t("auth.tenantRequired") }]}
          />
          <ProFormText
            name="username"
            fieldProps={{ autoComplete: "username", prefix: <UserOutlined />, size: "large" }}
            placeholder={t("auth.usernamePlaceholder")}
            rules={[{ required: true, message: t("auth.usernameRequired") }]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{ autoComplete: "current-password", prefix: <LockOutlined />, size: "large" }}
            placeholder={t("auth.passwordPlaceholder")}
            rules={[{ required: true, message: t("auth.passwordRequired") }]}
          />
        </ProForm>
        <div className="mt-3 text-right">
          <Button type="link" className="px-0!" onClick={() => setResetOpen(true)}>
            {t("auth.forgotPassword")}
          </Button>
        </div>
      </section>
      <ResetPasswordModal open={resetOpen} onClose={() => setResetOpen(false)} />
    </main>
  );
}
