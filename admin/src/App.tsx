import { App as AntApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { lazy, Suspense, useEffect, useState } from "react";
import { clearToken, getToken, setToken, apiRequest } from "./api";
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
  const [token, updateToken] = useState<string | null>(() => getToken());
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    apiRequest<{ admin: AdminUser }>("/api/admin/me")
      .then((data) => setAdmin(data.admin))
      .catch(() => {
        clearToken();
        updateToken(null);
      });
  }, [token]);

  return (
    <ConfigProvider locale={zhCN}>
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
