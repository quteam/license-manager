import { LockOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { PageContainer, ProLayout, type ProLayoutProps } from "@ant-design/pro-components";
import { Dropdown, Skeleton, Space } from "antd";
import { Suspense, useEffect, useMemo, useState } from "react";
import logoUrl from "../assets/logo.webp";
import { useI18n } from "../i18n";
import { defaultPage, getAdminPageRoutes, getMenuRoutes, getRouteMap, pathToPage, type PageKey } from "../routes";
import type { AdminUser } from "../types";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { LanguageDropdown } from "./LanguageDropdown";

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
  const menuRoutes = useMemo(() => getMenuRoutes(adminPageRoutes, t), [adminPageRoutes, t]);
  const [page, setPage] = useState<PageKey>(() => getPageFromLocation());
  const [passwordOpen, setPasswordOpen] = useState(false);
  const currentRoute = useMemo(() => routeMap[page], [page, routeMap]);
  const currentPage = currentRoute.element;
  const breadcrumbItems = useMemo(
    () => [
      { title: t("common.home") },
      ...(page === defaultPage ? [] : [{ title: currentRoute.name }])
    ],
    [currentRoute.name, page, t]
  );

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
        actionsRender={() => [<LanguageDropdown key="language" />]}
      >
        <PageContainer title={page === defaultPage ? false : currentRoute.name}>
          <Suspense fallback={<Skeleton active paragraph={{ rows: 10 }} />}>{currentPage}</Suspense>
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
