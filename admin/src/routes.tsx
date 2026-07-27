import {
  AppstoreOutlined,
  AuditOutlined,
  CodeOutlined,
  DashboardOutlined,
  FileTextOutlined,
  KeyOutlined,
  PlayCircleOutlined,
  SignatureOutlined,
  TeamOutlined
} from "@ant-design/icons";
import type { MenuDataItem } from "@ant-design/pro-components";
import { lazy, type ReactNode } from "react";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const AppsPage = lazy(() => import("./pages/AppsPage").then((module) => ({ default: module.AppsPage })));
const CodesPage = lazy(() => import("./pages/CodesPage").then((module) => ({ default: module.CodesPage })));
const GeneratePage = lazy(() => import("./pages/GeneratePage").then((module) => ({ default: module.GeneratePage })));
const LogsPage = lazy(() => import("./pages/LogsPage").then((module) => ({ default: module.LogsPage })));
const DocsPage = lazy(() => import("./pages/DocsPage").then((module) => ({ default: module.DocsPage })));
const SdkPage = lazy(() => import("./pages/SdkPage").then((module) => ({ default: module.SdkPage })));
const PlaygroundPage = lazy(() => import("./pages/PlaygroundPage").then((module) => ({ default: module.PlaygroundPage })));
const TenantsPage = lazy(() => import("./pages/TenantsPage").then((module) => ({ default: module.TenantsPage })));

export type PageKey = "dashboard" | "tenants" | "apps" | "codes" | "generate" | "logs" | "docs" | "sdk" | "playground";

type AdminRoute = MenuDataItem & {
  key: PageKey;
  path: string;
  name: string;
  element: ReactNode;
};

type Translate = (key: string) => string;

export const defaultPage: PageKey = "dashboard";

export function getAdminPageRoutes(t: Translate): AdminRoute[] {
  return [
  {
    key: "dashboard",
    path: "/dashboard",
    name: t("nav.dashboard"),
    icon: <DashboardOutlined />,
    element: <DashboardPage />,
  },
  {
    key: "tenants",
    path: "/tenants",
    name: t("nav.tenants"),
    icon: <TeamOutlined />,
    element: <TenantsPage />
  },
  {
    key: "apps",
    path: "/apps",
    name: t("nav.apps"),
    icon: <AppstoreOutlined />,
    element: <AppsPage />
  },
  {
    key: "codes",
    path: "/codes",
    name: t("nav.codes"),
    icon: <KeyOutlined />,
    element: <CodesPage />
  },
  {
    key: "generate",
    path: "/generate",
    name: t("nav.generate"),
    icon: <SignatureOutlined />,
    element: <GeneratePage />
  },
  {
    key: "logs",
    path: "/logs",
    name: t("nav.logs"),
    icon: <AuditOutlined />,
    element: <LogsPage />
  },
  {
    key: "docs",
    path: "/docs",
    name: t("nav.docs"),
    icon: <FileTextOutlined />,
    element: <DocsPage />
  },
  {
    key: "sdk",
    path: "/sdk",
    name: t("nav.sdk"),
    icon: <CodeOutlined />,
    element: <SdkPage />
  },
  {
    key: "playground",
    path: "/playground",
    name: "Playground",
    icon: <PlayCircleOutlined />,
    element: <PlaygroundPage />
  }
  ];
}

const routePaths: Array<[string, PageKey]> = [
  ["/dashboard", "dashboard"],
  ["/tenants", "tenants"],
  ["/apps", "apps"],
  ["/codes", "codes"],
  ["/generate", "generate"],
  ["/logs", "logs"],
  ["/docs", "docs"],
  ["/sdk", "sdk"],
  ["/playground", "playground"]
];

export const pathToPage = new Map<string, PageKey>(routePaths);

export function getRouteMap(routes: AdminRoute[]) {
  return Object.fromEntries(routes.map((route) => [route.key, route])) as Record<PageKey, AdminRoute>;
}

export function getMenuRoutes(routes: AdminRoute[], t: Translate, isSuperAdmin: boolean): MenuDataItem[] {
  const menuRouteMap = Object.fromEntries(routes.map(({ element: _element, ...route }) => [route.key, route])) as Record<
    PageKey,
    MenuDataItem
  >;

  return [
    menuRouteMap.dashboard,
    {
      key: "license",
      path: "/license",
      name: t("nav.license"),
      children: [menuRouteMap.apps, menuRouteMap.codes, menuRouteMap.generate]
    },
    {
      key: "audit",
      path: "/audit",
      name: t("nav.audit"),
      children: [menuRouteMap.logs]
    },
    {
      key: "support",
      path: "/support",
      name: t("nav.support"),
      children: [menuRouteMap.docs, menuRouteMap.sdk, menuRouteMap.playground]
    },
    ...(isSuperAdmin ? [{
      key: "system",
      path: "/system",
      name: t("nav.system"),
      children: [menuRouteMap.tenants]
    }] : [])
  ];
}
