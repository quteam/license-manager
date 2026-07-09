import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLicenseSdkEntries } from "./licenseSdks.ts";

const t = (key: string) =>
  ({
    "docs.secretPlaceholder": "Replace with saved app_secret",
    "sdk.coreName": "TypeScript Core",
    "sdk.coreDescription": "Framework-neutral client",
    "sdk.reactName": "React",
    "sdk.reactDescription": "React hook and component",
    "sdk.vueName": "Vue",
    "sdk.vueDescription": "Vue composable and component",
    "sdk.reactNativeName": "React Native",
    "sdk.reactNativeDescription": "React Native hook and screen"
  })[key] ?? key;

describe("license SDK templates", () => {
  it("creates SDK entries for the supported targets", () => {
    const entries = createLicenseSdkEntries("app_test", "https://license.example.com", t);

    assert.deepEqual(
      entries.map((entry) => entry.key),
      ["typescript", "react", "vue", "react-native"]
    );
    assert.deepEqual(
      entries.map((entry) => entry.filename),
      ["license-client.ts", "LicenseGate.tsx", "LicenseGate.vue", "LicenseScreen.tsx"]
    );
  });

  it("injects app id and API base URL while keeping the secret as a placeholder", () => {
    const entries = createLicenseSdkEntries("app_test", "https://license.example.com", t);

    for (const entry of entries) {
      assert.match(entry.code, /app_test/);
      assert.match(entry.code, /https:\/\/license\.example\.com/);
      assert.match(entry.code, /Replace with saved app_secret/);
      assert.doesNotMatch(entry.code, /real_secret/);
    }
  });
});
