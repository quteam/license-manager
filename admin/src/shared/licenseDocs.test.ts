import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHtmlDemo, createJavaScriptDemo, createTypeScriptDemo } from "./licenseDocs.ts";

const t = (key: string) =>
  ({
    "docs.secretPlaceholder": "Replace with saved app_secret",
    "docs.errorFallback": "License request failed",
    "docs.codePlaceholder": "Activation code",
    "docs.devicePlaceholder": "Device fingerprint",
    "docs.activateButton": "Activate",
    "common.language": "Language"
  })[key] ?? key;

describe("license documentation demos", () => {
  it("provides getAppInfo through the JavaScript demo request helper", () => {
    const demo = createJavaScriptDemo("app_test", "https://license.example.com", t);

    assert.match(demo, /async function requestClient/);
    assert.match(demo, /export function getAppInfo\(\)/);
    assert.match(demo, /requestClient\("\/api\/client\/app-info"\)/);
    assert.match(demo, /NETWORK_ERROR/);
  });

  it("provides a typed getAppInfo method that shares API error handling", () => {
    const demo = createTypeScriptDemo("app_test", "https://license.example.com", t);

    assert.match(demo, /export type AppInfoData/);
    assert.match(demo, /getAppInfo\(\)/);
    assert.match(demo, /this\.request<AppInfoData>\("\/api\/client\/app-info"\)/);
    assert.match(demo, /export class LicenseApiError/);
  });

  it("renders API and network failures in the HTML demo", () => {
    const demo = createHtmlDemo("app_test", "https://license.example.com", t);

    assert.match(demo, /response\.json\(\)\.catch\(\(\) => null\)/);
    assert.match(demo, /NETWORK_ERROR/);
  });
});
