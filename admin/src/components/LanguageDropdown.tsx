import { DownOutlined, GlobalOutlined } from "@ant-design/icons";
import { Button, Dropdown, Space, type MenuProps } from "antd";
import { useI18n } from "../i18n";
import { getLanguageMenu } from "../i18n/languageOptions";

export function LanguageDropdown() {
  const { language, setLanguage, t } = useI18n();
  const languageMenu = getLanguageMenu(language, t);
  const currentLabel =
    languageMenu.items.find((item) => item.key === language)?.label ?? t("common.language");

  const items: MenuProps["items"] = languageMenu.items;

  return (
    <Dropdown
      menu={{
        items,
        selectedKeys: languageMenu.selectedKeys,
        onClick: ({ key }) => {
          if (key === "zh" || key === "en") {
            setLanguage(key);
          }
        }
      }}
      trigger={["click"]}
    >
      <Button aria-label={t("common.language")} icon={<GlobalOutlined />} size="small" type="text">
        <Space size={4}>
          <span>{currentLabel}</span>
          <DownOutlined className="text-[10px]" />
        </Space>
      </Button>
    </Dropdown>
  );
}
