import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getLanguageMenu } from "./languageOptions.ts";

describe("language menu options", () => {
  it("marks the current language and uses translated labels", () => {
    const menu = getLanguageMenu("en", (key) => {
      const labels: Record<string, string> = {
        "common.chinese": "Chinese",
        "common.english": "English"
      };
      return labels[key] ?? key;
    });

    assert.deepEqual(menu.items, [
      { key: "zh", label: "Chinese" },
      { key: "en", label: "English" }
    ]);
    assert.deepEqual(menu.selectedKeys, ["en"]);
  });
});
