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
    "sdk.reactNativeDescription": "React Native hook and screen",
    "sdk.angularName": "Angular",
    "sdk.angularDescription": "Angular service and component",
    "sdk.svelteName": "Svelte",
    "sdk.svelteDescription": "Svelte component",
    "sdk.electronName": "Electron",
    "sdk.electronDescription": "Electron renderer helper",
    "sdk.flutterName": "Flutter / Dart",
    "sdk.flutterDescription": "Dart client"
  })[key] ?? key;

describe("license SDK templates", () => {
  it("creates SDK entries for the supported targets", () => {
    const entries = createLicenseSdkEntries("app_test", "https://license.example.com", t);

    assert.deepEqual(
      entries.map((entry) => entry.key),
      ["typescript", "react", "vue", "react-native", "angular", "svelte", "electron", "flutter"]
    );
    assert.deepEqual(
      entries.map((entry) => entry.filename),
      [
        "license-client.ts",
        "LicenseGate.tsx",
        "LicenseGate.vue",
        "LicenseScreen.tsx",
        "license.service.ts",
        "LicenseGate.svelte",
        "license-electron.ts",
        "license_client.dart"
      ]
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

  it("includes every client API in every SDK component", () => {
    const entries = createLicenseSdkEntries("app_test", "https://license.example.com", t);

    for (const entry of entries) {
      assert.match(entry.code, /\/api\/client\/activate/);
      assert.match(entry.code, /\/api\/client\/verify/);
      assert.match(entry.code, /\/api\/client\/unbind-device/);
      assert.match(entry.code, /getAppInfo/);
      assert.match(entry.code, /\/api\/client\/app-info/);
    }
  });

  it("renders operations for every client API in interactive SDK components", () => {
    const entries = createLicenseSdkEntries("app_test", "https://license.example.com", t);
    const interactiveEntries = entries.filter((entry) => ["react", "vue", "react-native", "angular", "svelte"].includes(entry.key));

    for (const entry of interactiveEntries) {
      assert.match(entry.code, /Activate/);
      assert.match(entry.code, /Verify/);
      assert.match(entry.code, /Unbind device/);
      assert.match(entry.code, /Get app info/);
    }
  });
});
