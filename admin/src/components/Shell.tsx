import { LockOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { PageContainer, ProLayout, type ProLayoutProps } from "@ant-design/pro-components";
import { Dropdown, Select, Skeleton, Space } from "antd";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import logoUrl from "../assets/logo.webp";
import { apiRequest, getTenantId, setTenantId as persistTenantId } from "../api";
import { useI18n } from "../i18n";
import { defaultPage, getAdminPageRoutes, getMenuRoutes, getRouteMap, pathToPage, type PageKey } from "../routes";
import type { AdminUser, TenantItem } from "../types";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { LanguageDropdown } from "./LanguageDropdown";
import { PageTitleExtraProvider } from "./PageTitleExtraContext";

function normalizePath(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function getPageFromLocation(): PageKey {
  return pathToPage.get(normalizePath(window.location.pathname)) ?? defaultPage;
}

const layoutSettings: ProLayoutProps = {
  layout: "mix",
  contentWidth: "Fluid",
  navTheme: "light",
  fixedHeader: true,
  fixSiderbar: true,
  siderMenuType: "group",
  splitMenus: false,
  stylish: {
    sider: (token) => ({
      [`${token.antCls}-menu-item-group-title`]: {
        color: token.colorTextTertiary,
        fontSize: token.fontSizeSM,
        fontWeight: 400
      },
      [`${token.antCls}-menu-item-divider`]: {
        display: "none"
      }
    })
  }
};

type ShellProps = {
  admin: AdminUser | null;
  onLogout: () => void;
};

export function Shell({ admin, onLogout }: ShellProps) {
  const { t } = useI18n();
  const adminPageRoutes = useMemo(() => getAdminPageRoutes(t), [t]);
  const routeMap = useMemo(() => getRouteMap(adminPageRoutes), [adminPageRoutes]);
  const isSuperAdmin = admin?.role === "super_admin";
  const menuRoutes = useMemo(() => getMenuRoutes(adminPageRoutes, t, isSuperAdmin), [adminPageRoutes, isSuperAdmin, t]);
  const [page, setPage] = useState<PageKey>(() => getPageFromLocation());
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pageTitleExtra, setPageTitleExtra] = useState<ReactNode | null>(null);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [tenantId, setTenantId] = useState<number | null>(() => getTenantId());
  const currentRoute = useMemo(() => routeMap[page], [page, routeMap]);
  const currentPage = currentRoute.element;
  const pageTitle = useMemo(() => {
    if (page === defaultPage) {
      return false;
    }

    if (!pageTitleExtra) {
      return currentRoute.name;
    }

    return (
      <Space align="center" size={12} wrap>
        <span>{currentRoute.name}</span>
        {pageTitleExtra}
      </Space>
    );
  }, [currentRoute.name, page, pageTitleExtra]);
  const breadcrumbItems = useMemo(
    () => [
      { title: t("common.home") },
      ...(page === defaultPage ? [] : [{ title: currentRoute.name }])
    ],
    [currentRoute.name, page, t]
  );

  useEffect(() => {
    if (!admin) {
      return;
    }
    if (admin.role === "tenant_admin") {
      setTenantId(admin.tenant_id);
      return;
    }

    const loadTenants = () => {
      apiRequest<{ items: TenantItem[] }>("/api/admin/tenants").then(({ items }) => {
        setTenants(items);
        const activeItems = items.filter((item) => item.status === "active");
        const current = getTenantId();
        const next = activeItems.some((item) => item.id === current) ? current : (activeItems[0]?.id ?? null);
        if (next) {
          persistTenantId(next);
        }
        setTenantId(next);
      });
    };
    loadTenants();
    window.addEventListener("tenant-list-changed", loadTenants);
    return () => window.removeEventListener("tenant-list-changed", loadTenants);
  }, [admin]);

  useEffect(() => {
    if (admin && admin.role !== "super_admin" && page === "tenants") {
      setPage(defaultPage);
    }
  }, [admin?.role, page]);

  useEffect(() => {
    const nextPath = currentRoute.path;
    if (normalizePath(window.location.pathname) !== nextPath) {
      window.history.replaceState(null, "", nextPath);
    }
  }, [currentRoute.path]);

  useEffect(() => {
    const handlePopState = () => {
      setPage(getPageFromLocation());
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigateToPage = (nextPage: PageKey) => {
    const nextRoute = routeMap[nextPage];
    if (nextPage !== page) {
      window.history.pushState(null, "", nextRoute.path);
      setPage(nextPage);
    }
  };

  return (
    <>
      <ProLayout
        {...layoutSettings}
        title={t("app.title")}
        logo={logoUrl}
        route={{ path: "/", routes: menuRoutes }}
        location={{ pathname: currentRoute.path }}
        menu={{ type: "group" }}
        menuItemRender={(item, dom) => (
          <a
            href={item.path}
            onClick={(event) => {
              event.preventDefault();
              const nextPage = item.key;
              if (typeof nextPage === "string" && nextPage in routeMap) {
                navigateToPage(nextPage as PageKey);
              }
            }}
          >
            {dom}
          </a>
        )}
        avatarProps={{
          icon: <UserOutlined />,
          size: "small",
          render: (_, dom) => (
            <Dropdown
              menu={{
                items: [
                  { key: "password", icon: <LockOutlined />, label: t("auth.changePassword") },
                  { key: "logout", icon: <LogoutOutlined />, label: t("common.logout"), danger: true }
                ],
                onClick: ({ key }) => {
                  if (key === "password") {
                    setPasswordOpen(true);
                    return;
                  }
                  onLogout();
                }
              }}
              trigger={["click"]}
            >
              <button className="cursor-pointer border-0 bg-transparent p-0 text-inherit" type="button">
                <Space size={8}>
                  {dom}
                  <span>{admin?.username ?? "admin"}</span>
                </Space>
              </button>
            </Dropdown>
          )
        }}
        actionsRender={() => [
          ...(isSuperAdmin ? [
            <Select
              key="tenant"
              className="min-w-40"
              value={tenantId ?? undefined}
              placeholder={t("tenants.selectTenant")}
              options={tenants.filter((tenant) => tenant.status === "active").map((tenant) => ({ label: tenant.name, value: tenant.id }))}
              onChange={(value) => {
                persistTenantId(value);
                setTenantId(value);
              }}
            />
          ] : []),
          <LanguageDropdown key="language" />
        ]}
      >
        <PageContainer title={pageTitle}>
          <PageTitleExtraProvider value={setPageTitleExtra}>
            {isSuperAdmin && page !== "tenants" && !tenantId ? (
              <Skeleton active paragraph={{ rows: 10 }} />
            ) : (
              <Suspense key={tenantId ?? "no-tenant"} fallback={<Skeleton active paragraph={{ rows: 10 }} />}>{currentPage}</Suspense>
            )}
          </PageTitleExtraProvider>
        </PageContainer>
      </ProLayout>
      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onChanged={() => {
          setPasswordOpen(false);
          onLogout();
        }}
      />
    </>
  );
}
