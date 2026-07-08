import type { Language } from "./core";

type Translate = (key: "common.chinese" | "common.english") => string;

export function getLanguageMenu(language: Language, t: Translate) {
  return {
    items: [
      { key: "zh", label: t("common.chinese") },
      { key: "en", label: t("common.english") }
    ],
    selectedKeys: [language]
  };
}
