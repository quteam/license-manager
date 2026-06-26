import {
  AppstoreOutlined,
  AuditOutlined,
  DashboardOutlined,
  FileTextOutlined,
  KeyOutlined,
  PlayCircleOutlined,
  SignatureOutlined
} from "@ant-design/icons";
import type { MenuDataItem } from "@ant-design/pro-components";
import { lazy, type ReactNode } from "react";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const AppsPage = lazy(() => import("./pages/AppsPage").then((module) => ({ default: module.AppsPage })));
const CodesPage = lazy(() => import("./pages/CodesPage").then((module) => ({ default: module.CodesPage })));
const GeneratePage = lazy(() => import("./pages/GeneratePage").then((module) => ({ default: module.GeneratePage })));
const LogsPage = lazy(() => import("./pages/LogsPage").then((module) => ({ default: module.LogsPage })));
const DocsPage = lazy(() => import("./pages/DocsPage").then((module) => ({ default: module.DocsPage })));
const PlaygroundPage = lazy(() => import("./pages/PlaygroundPage").then((module) => ({ default: module.PlaygroundPage })));

export type PageKey = "dashboard" | "apps" | "codes" | "generate" | "logs" | "docs" | "playground";

type AdminRoute = MenuDataItem & {
  key: PageKey;
  path: string;
  name: string;
  element: ReactNode;
};

export const defaultPage: PageKey = "dashboard";

export const adminPageRoutes: AdminRoute[] = [
  {
    key: "dashboard",
    path: "/dashboard",
    name: "仪表盘",
    icon: <DashboardOutlined />,
    element: <DashboardPage />,
  },
  {
    key: "apps",
    path: "/apps",
    name: "应用管理",
    icon: <AppstoreOutlined />,
    element: <AppsPage />
  },
  {
    key: "codes",
    path: "/codes",
    name: "激活码",
    icon: <KeyOutlined />,
    element: <CodesPage />
  },
  {
    key: "generate",
    path: "/generate",
    name: "生成激活码",
    icon: <SignatureOutlined />,
    element: <GeneratePage />
  },
  {
    key: "logs",
    path: "/logs",
    name: "操作日志",
    icon: <AuditOutlined />,
    element: <LogsPage />
  },
  {
    key: "docs",
    path: "/docs",
    name: "接入文档",
    icon: <FileTextOutlined />,
    element: <DocsPage />
  },
  {
    key: "playground",
    path: "/playground",
    name: "Playground",
    icon: <PlayCircleOutlined />,
    element: <PlaygroundPage />
  }
];

export const routeMap = Object.fromEntries(adminPageRoutes.map((route) => [route.key, route])) as Record<
  PageKey,
  AdminRoute
>;

export const pathToPage = new Map<string, PageKey>(adminPageRoutes.map((route) => [route.path, route.key]));

const menuRouteMap = Object.fromEntries(adminPageRoutes.map(({ element: _element, ...route }) => [route.key, route])) as Record<
  PageKey,
  MenuDataItem
>;

export const menuRoutes: MenuDataItem[] = [
  menuRouteMap.dashboard,
  {
    key: "license",
    path: "/license",
    name: "授权管理",
    children: [menuRouteMap.apps, menuRouteMap.codes, menuRouteMap.generate]
  },
  {
    key: "audit",
    path: "/audit",
    name: "审计管理",
    children: [menuRouteMap.logs]
  },
  {
    key: "support",
    path: "/support",
    name: "开发支持",
    children: [menuRouteMap.docs, menuRouteMap.playground]
  }
];
