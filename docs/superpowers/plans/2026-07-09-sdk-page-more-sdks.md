# More SDK Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Extend the existing SDK page with Angular, Svelte, Electron, and Flutter/Dart templates.

**Architecture:** Keep the `SdkPage` rendering unchanged because it already maps over SDK entries. Extend `admin/src/shared/licenseSdks.ts` with additional entry metadata and generators, then update tests, i18n, and frontend docs to match.

**Tech Stack:** TypeScript, React admin app, Ant Design tabs via existing `SdkPage`, Node `node:test`.

---

### Task 1: Add Failing SDK Coverage

**Files:**
- Modify: `admin/src/shared/licenseSdks.test.ts`

- [x] **Step 1: Extend the translator stub**

Add keys for `sdk.angularName`, `sdk.angularDescription`, `sdk.svelteName`, `sdk.svelteDescription`, `sdk.electronName`, `sdk.electronDescription`, `sdk.flutterName`, and `sdk.flutterDescription`.

- [x] **Step 2: Extend expected SDK keys and filenames**

Expected keys:

```ts
["typescript", "react", "vue", "react-native", "angular", "svelte", "electron", "flutter"]
```

Expected filenames:

```ts
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
```

- [x] **Step 3: Run test and verify it fails**

Run: `pnpm --filter @license-manager/admin exec node --test src/shared/licenseSdks.test.ts`

Expected: FAIL because only four SDK entries exist.

### Task 2: Implement Additional SDK Templates

**Files:**
- Modify: `admin/src/shared/licenseSdks.ts`

- [x] **Step 1: Extend `LicenseSdkEntry.key`**

Add `"angular" | "svelte" | "electron" | "flutter"` to the key union.

- [x] **Step 2: Add four SDK entries**

Add entries after React Native:

```ts
{
  key: "angular",
  name: t("sdk.angularName"),
  description: t("sdk.angularDescription"),
  filename: "license.service.ts",
  language: "typescript",
  code: createAngularSdk(appId, apiBaseUrl, secretPlaceholder)
}
```

Use the same shape for Svelte, Electron, and Flutter with filenames from Task 1. Svelte should use `language: "html"` and Flutter should use `language: "text"`.

- [x] **Step 3: Add generator functions**

Add `createAngularSdk`, `createSvelteSdk`, `createElectronSdk`, and `createFlutterSdk`. Each generated template must include the selected `app_id`, API base URL, secret placeholder, `code`, and `device_fingerprint`, and must throw or surface an error when `ok: false`.

- [x] **Step 4: Run SDK test and verify it passes**

Run: `pnpm --filter @license-manager/admin exec node --test src/shared/licenseSdks.test.ts`

Expected: PASS with 2 tests.

### Task 3: Update Text and Docs

**Files:**
- Modify: `admin/src/i18n/messages.ts`
- Modify: `docs/FRONTEND.md`

- [x] **Step 1: Add Chinese and English SDK labels**

Add matching keys to both `sdk` dictionaries: `angularName`, `angularDescription`, `svelteName`, `svelteDescription`, `electronName`, `electronDescription`, `flutterName`, `flutterDescription`.

- [x] **Step 2: Update frontend docs**

Update the SDK page sentence in `docs/FRONTEND.md` to list React, Vue, React Native, Angular, Svelte, Electron, Flutter/Dart, and TypeScript Core.

### Task 4: Verify and Commit

**Files:**
- Verify all changed files.

- [x] **Step 1: Run focused tests**

Run: `pnpm --filter @license-manager/admin exec node --test src/i18n/core.test.ts src/i18n/languageOptions.test.ts src/shared/licenseSdks.test.ts`

Expected: PASS.

- [x] **Step 2: Run admin type-check**

Run: `pnpm --filter @license-manager/admin type-check`

Expected: PASS.

- [x] **Step 3: Run admin build**

Run: `pnpm --filter @license-manager/admin build`

Expected: PASS. Existing chunk-size warnings are acceptable.

- [x] **Step 4: Commit**

```bash
git add admin/src/shared/licenseSdks.ts admin/src/shared/licenseSdks.test.ts admin/src/i18n/messages.ts docs/FRONTEND.md docs/superpowers/plans/2026-07-09-sdk-page-more-sdks.md
git commit -m "feat: 扩展常用 SDK 模板"
```

