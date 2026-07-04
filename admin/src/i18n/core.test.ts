import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createTranslator,
  detectInitialLanguage,
  isLanguage,
  normalizeLanguage,
  type Language
} from "./core.ts";
import { dictionaries } from "./messages.ts";

describe("i18n core", () => {
  it("uses a saved language before the system language", () => {
    assert.equal(detectInitialLanguage("en", "zh-CN"), "en");
  });

  it("defaults to Chinese for Chinese system locales", () => {
    assert.equal(detectInitialLanguage(null, "zh-Hans-CN"), "zh");
  });

  it("defaults to English for non-Chinese system locales", () => {
    assert.equal(detectInitialLanguage(null, "fr-FR"), "en");
  });

  it("normalizes unsupported saved values to null", () => {
    assert.equal(normalizeLanguage("de"), null);
    assert.equal(isLanguage("zh"), true);
    assert.equal(isLanguage("en"), true);
  });

  it("translates known keys and interpolates variables", () => {
    const t = createTranslator("en", dictionaries);
    assert.equal(t("app.title"), "License Manager");
    assert.equal(t("messages.generatedCodes", { count: 3 }), "Generated 3 activation codes");
  });

  it("requires both dictionaries to expose the same keys", () => {
    const zhKeys = flattenKeys(dictionaries.zh);
    const enKeys = flattenKeys(dictionaries.en);
    assert.deepEqual(enKeys, zhKeys);
  });
});

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") {
    return [prefix];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.entries(value)
    .flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

void (null as Language | null);
