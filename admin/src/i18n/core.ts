export const LANGUAGES = ["zh", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export type TranslationValues = Record<string, string | number>;
export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}
export type Dictionaries = Record<Language, TranslationDictionary>;

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && LANGUAGES.includes(value as Language);
}

export function normalizeLanguage(value: unknown): Language | null {
  if (!isLanguage(value)) {
    return null;
  }
  return value;
}

export function detectInitialLanguage(savedLanguage: unknown, systemLanguage: string | undefined): Language {
  const normalizedSaved = normalizeLanguage(savedLanguage);
  if (normalizedSaved) {
    return normalizedSaved;
  }
  return systemLanguage?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function createTranslator(language: Language, dictionaries: Dictionaries) {
  return (key: string, values: TranslationValues = {}) => {
    const template = getDictionaryValue(dictionaries[language], key) ?? getDictionaryValue(dictionaries.zh, key) ?? key;
    return interpolate(template, values);
  };
}

function getDictionaryValue(dictionary: TranslationDictionary, key: string): string | null {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, dictionary);

  return typeof value === "string" ? value : null;
}

function interpolate(template: string, values: TranslationValues) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
