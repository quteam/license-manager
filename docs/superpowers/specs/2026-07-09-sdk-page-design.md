# SDK Page Design

## Goal

Add a dedicated SDK page under the admin console's Developer Support menu. The page helps developers copy or download ready-to-use SDK components for common client stacks, starting with React, Vue, React Native, and a framework-neutral TypeScript core client.

## Scope

- Add a new admin page at `/sdk`.
- Add an `SDK` menu item under Developer Support, between Integration Docs and Playground.
- Let users select an app from existing app catalogs.
- Generate SDK code using the current origin as `apiBaseUrl` and the selected app's `app_id`.
- Provide copy and download actions for each SDK file.
- Keep `app_secret` as a placeholder. The page must not store, request, or display a real secret.

## User Experience

The page title is `SDK`. A title-level app selector mirrors the Integration Docs page so developers can switch the generated `app_id` without leaving the page.

The content uses Ant Design Pro cards and tabs:

- A warning banner states that `app_secret` is a placeholder and should not be committed.
- A compact summary shows the API base URL and selected app ID.
- Tabs list SDK targets:
  - TypeScript Core: framework-neutral `LicenseClient`.
  - React: hook and component for activation and verification.
  - Vue: composable and single-file component.
  - React Native: hook and screen component using `fetch`.

Each tab includes:

- Target name and recommended filename.
- Short usage context.
- Copy button through the existing `CodeBlock`.
- Download button that creates a local text blob in the browser.

## Architecture

- `admin/src/routes.tsx`
  - Extend `PageKey` with `sdk`.
  - Lazy-load `SdkPage`.
  - Add route `/sdk` with an appropriate icon.
  - Add it to the Developer Support menu between docs and playground.

- `admin/src/pages/SdkPage.tsx`
  - Owns page state, app selector, and tab rendering.
  - Uses `useCatalogs`, `useI18n`, `usePageTitleExtra`, and `CodeBlock`.
  - Uses browser `Blob` and temporary object URLs for download.

- `admin/src/shared/licenseSdks.ts`
  - Owns SDK metadata and code generation templates.
  - Exposes a function that returns SDK entries for a selected `appId`, `apiBaseUrl`, and translator.
  - Keeps templates deterministic and free of real secrets.

- `admin/src/i18n/messages.ts`
  - Add navigation and SDK page strings in Chinese and English.

- `docs/FRONTEND.md`
  - Update page list and Developer Support menu convention to include the SDK page.

## Data Flow

1. `SdkPage` reads apps through `useCatalogs`.
2. The first available app is selected automatically; otherwise `app_xxx` is used.
3. `window.location.origin` becomes the generated API base URL.
4. `licenseSdks` generates SDK entries with the selected app ID and placeholder secret.
5. `CodeBlock` displays and copies the generated source code.
6. Download writes the same source code to a file named by the SDK entry.

## Error Handling

This page does not call mutation APIs. If no apps are loaded, the fallback `app_xxx` keeps templates usable. Download failures are unlikely but should surface through Ant Design message feedback.

## Security

- Never request or persist `app_secret` on the SDK page.
- Generated code uses a clear placeholder for `app_secret`.
- Do not include activation codes, device fingerprints, tokens, or real secrets in generated files.
- Do not log sensitive values.

## Testing

- Add focused tests for `licenseSdks` template generation to verify:
  - React, Vue, React Native, and TypeScript Core entries exist.
  - Generated code includes the selected `app_id` and API base URL.
  - Generated code contains only the secret placeholder, not a real secret.
- Run `pnpm --filter @license-manager/admin type-check`.

