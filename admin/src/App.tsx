import { App as AntApp, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { lazy, Suspense, useEffect, useState } from "react";
import { clearToken, getToken, setTenantId, setToken, apiRequest } from "./api";
import { LanguageProvider, useI18n } from "./i18n";
import type { AdminUser } from "./types";

const Login = lazy(() => import("./components/Login").then((module) => ({ default: module.Login })));
const Shell = lazy(() => import("./components/Shell").then((module) => ({ default: module.Shell })));

function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
      <div className="size-8 animate-spin rounded-full border-2 border-[#d9d9d9] border-t-[#1677ff]" />
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <LocalizedApp />
    </LanguageProvider>
  );
}

function LocalizedApp() {
  const { language } = useI18n();
  const [token, updateToken] = useState<string | null>(() => getToken());
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    apiRequest<{ admin: AdminUser }>("/api/admin/me")
      .then((data) => {
        setAdmin(data.admin);
        if (data.admin.role === "tenant_admin" && data.admin.tenant_id) {
          setTenantId(data.admin.tenant_id);
        }
      })
      .catch(() => {
        clearToken();
        updateToken(null);
      });
  }, [token]);

  return (
    <ConfigProvider locale={language === "zh" ? zhCN : enUS}>
      <AntApp>
        {token ? (
          <Suspense fallback={<AppLoading />}>
            <Shell
              admin={admin}
              onLogout={() => {
                clearToken();
                updateToken(null);
                setAdmin(null);
              }}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<AppLoading />}>
            <Login
              onLogin={(nextToken, nextAdmin) => {
                setToken(nextToken);
                updateToken(nextToken);
                setAdmin(nextAdmin);
              }}
            />
          </Suspense>
        )}
      </AntApp>
    </ConfigProvider>
  );
}
