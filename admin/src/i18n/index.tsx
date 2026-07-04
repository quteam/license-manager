import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createTranslator, detectInitialLanguage, type Language, type TranslationValues } from "./core";
import { dictionaries } from "./messages";

const LANGUAGE_STORAGE_KEY = "license-manager-language";

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    detectInitialLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY), navigator.language)
  );

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: createTranslator(language, dictionaries)
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside LanguageProvider");
  }
  return context;
}
