import type { CodeLanguage } from "./CodeBlock";

type Translate = (key: string, values?: Record<string, string | number>) => string;

export type LicenseSdkEntry = {
  key: "typescript" | "react" | "vue" | "react-native" | "angular" | "svelte" | "electron" | "flutter";
  name: string;
  description: string;
  filename: string;
  language: CodeLanguage;
  code: string;
};

export function createLicenseSdkEntries(appId: string, apiBaseUrl: string, t: Translate): LicenseSdkEntry[] {
  const secretPlaceholder = t("docs.secretPlaceholder");

  return [
    {
      key: "typescript",
      name: t("sdk.coreName"),
      description: t("sdk.coreDescription"),
      filename: "license-client.ts",
      language: "typescript",
      code: createCoreSdk(appId, apiBaseUrl, secretPlaceholder)
    },
    {
      key: "react",
      name: t("sdk.reactName"),
      description: t("sdk.reactDescription"),
      filename: "LicenseGate.tsx",
      language: "typescript",
      code: createReactSdk(appId, apiBaseUrl, secretPlaceholder)
    },
    {
      key: "vue",
      name: t("sdk.vueName"),
      description: t("sdk.vueDescription"),
      filename: "LicenseGate.vue",
      language: "html",
      code: createVueSdk(appId, apiBaseUrl, secretPlaceholder)
    },
    {
      key: "react-native",
      name: t("sdk.reactNativeName"),
      description: t("sdk.reactNativeDescription"),
      filename: "LicenseScreen.tsx",
      language: "typescript",
      code: createReactNativeSdk(appId, apiBaseUrl, secretPlaceholder)
    },
    {
      key: "angular",
      name: t("sdk.angularName"),
      description: t("sdk.angularDescription"),
      filename: "license.service.ts",
      language: "typescript",
      code: createAngularSdk(appId, apiBaseUrl, secretPlaceholder)
    },
    {
      key: "svelte",
      name: t("sdk.svelteName"),
      description: t("sdk.svelteDescription"),
      filename: "LicenseGate.svelte",
      language: "html",
      code: createSvelteSdk(appId, apiBaseUrl, secretPlaceholder)
    },
    {
      key: "electron",
      name: t("sdk.electronName"),
      description: t("sdk.electronDescription"),
      filename: "license-electron.ts",
      language: "typescript",
      code: createElectronSdk(appId, apiBaseUrl, secretPlaceholder)
    },
    {
      key: "flutter",
      name: t("sdk.flutterName"),
      description: t("sdk.flutterDescription"),
      filename: "license_client.dart",
      language: "text",
      code: createFlutterSdk(appId, apiBaseUrl, secretPlaceholder)
    }
  ];
}

function createCoreSdk(appId: string, apiBaseUrl: string, secretPlaceholder: string) {
  return `export type LicensePlan = {
  code: string;
  name: string;
  duration_days: number;
};

export type LicenseData = {
  valid: boolean;
  device_bound: boolean;
  app_id: string;
  plan: LicensePlan;
  activated_at: string | null;
  expires_at: string | null;
  remaining_seconds: number;
  rebind_count: number;
  max_rebinds: number;
};

export type AppInfoData = {
  app_id: string;
  name: string;
  description: string | null;
  purchase_url: string | null;
  platform: string;
  status: "active" | "disabled";
};

type LicenseApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type LicenseClientConfig = {
  apiBaseUrl: string;
  appId: string;
  appSecret: string;
};

type LicenseRequest = {
  code: string;
  deviceFingerprint: string;
};

export class LicenseClient {
  constructor(private readonly config: LicenseClientConfig) {}

  activate({ code, deviceFingerprint }: LicenseRequest) {
    return this.request<LicenseData>("/api/client/activate", {
      code,
      device_fingerprint: deviceFingerprint
    });
  }

  verify({ code, deviceFingerprint }: LicenseRequest) {
    return this.request<LicenseData>("/api/client/verify", {
      code,
      device_fingerprint: deviceFingerprint
    });
  }

  unbindDevice({ code, deviceFingerprint }: LicenseRequest) {
    return this.request<LicenseData>("/api/client/unbind-device", {
      code,
      device_fingerprint: deviceFingerprint
    });
  }

  getAppInfo() {
    return this.request<AppInfoData>("/api/client/app-info");
  }

  private async request<T>(path: string, body: Record<string, string> = {}): Promise<T> {
    const response = await fetch(\`\${this.config.apiBaseUrl}\${path}\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
        ...body
      })
    });
    const payload = (await response.json()) as LicenseApiResponse<T>;

    if (!payload.ok) {
      throw new Error(payload.error.message || payload.error.code);
    }

    return payload.data;
  }
}

export const licenseClient = new LicenseClient({
  apiBaseUrl: ${toJsString(apiBaseUrl)},
  appId: ${toJsString(appId)},
  appSecret: ${toJsString(secretPlaceholder)}
});`;
}

function createReactSdk(appId: string, apiBaseUrl: string, secretPlaceholder: string) {
  return `import { FormEvent, useCallback, useState } from "react";

type LicenseData = {
  valid: boolean;
  device_bound: boolean;
  expires_at: string | null;
  remaining_seconds: number;
};

type LicenseApiResponse =
  | { ok: true; data: LicenseData }
  | { ok: false; error: { code: string; message: string } };

const API_BASE_URL = ${toJsString(apiBaseUrl)};
const APP_ID = ${toJsString(appId)};
const APP_SECRET = ${toJsString(secretPlaceholder)};

async function requestLicense(path: string, code: string, deviceFingerprint: string): Promise<LicenseData> {
  const response = await fetch(\`\${API_BASE_URL}\${path}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET,
      code,
      device_fingerprint: deviceFingerprint
    })
  });
  const payload = (await response.json()) as LicenseApiResponse;

  if (!payload.ok) {
    throw new Error(payload.error.message || payload.error.code);
  }

  return payload.data;
}

export function useLicense(deviceFingerprint: string) {
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activate = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestLicense("/api/client/activate", code, deviceFingerprint);
      setLicense(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "License request failed";
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [deviceFingerprint]);

  const verify = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestLicense("/api/client/verify", code, deviceFingerprint);
      setLicense(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "License request failed";
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [deviceFingerprint]);

  return { activate, verify, license, error, loading };
}

export function LicenseGate({ deviceFingerprint }: { deviceFingerprint: string }) {
  const [code, setCode] = useState("");
  const { activate, license, error, loading } = useLicense(deviceFingerprint);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await activate(code.trim());
  }

  if (license?.valid) {
    return <div>License valid until {license.expires_at ?? "never"}</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Activation code" required />
      <button type="submit" disabled={loading}>{loading ? "Activating..." : "Activate"}</button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}`;
}

function createVueSdk(appId: string, apiBaseUrl: string, secretPlaceholder: string) {
  return `<script setup lang="ts">
import { ref } from "vue";

type LicenseData = {
  valid: boolean;
  device_bound: boolean;
  expires_at: string | null;
  remaining_seconds: number;
};

type LicenseApiResponse =
  | { ok: true; data: LicenseData }
  | { ok: false; error: { code: string; message: string } };

const API_BASE_URL = ${toJsString(apiBaseUrl)};
const APP_ID = ${toJsString(appId)};
const APP_SECRET = ${toJsString(secretPlaceholder)};
const DEVICE_FINGERPRINT = "stable-device-id";

const code = ref("");
const license = ref<LicenseData | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

async function requestLicense(path: string, activationCode: string) {
  const response = await fetch(\`\${API_BASE_URL}\${path}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET,
      code: activationCode,
      device_fingerprint: DEVICE_FINGERPRINT
    })
  });
  const payload = (await response.json()) as LicenseApiResponse;

  if (!payload.ok) {
    throw new Error(payload.error.message || payload.error.code);
  }

  return payload.data;
}

async function activate() {
  loading.value = true;
  error.value = null;
  try {
    license.value = await requestLicense("/api/client/activate", code.value.trim());
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : "License request failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section v-if="license?.valid">
    License valid until {{ license.expires_at ?? "never" }}
  </section>
  <form v-else @submit.prevent="activate">
    <input v-model="code" placeholder="Activation code" required />
    <button type="submit" :disabled="loading">
      {{ loading ? "Activating..." : "Activate" }}
    </button>
    <p v-if="error" role="alert">{{ error }}</p>
  </form>
</template>`;
}

function createReactNativeSdk(appId: string, apiBaseUrl: string, secretPlaceholder: string) {
  return `import { useCallback, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

type LicenseData = {
  valid: boolean;
  device_bound: boolean;
  expires_at: string | null;
  remaining_seconds: number;
};

type LicenseApiResponse =
  | { ok: true; data: LicenseData }
  | { ok: false; error: { code: string; message: string } };

const API_BASE_URL = ${toJsString(apiBaseUrl)};
const APP_ID = ${toJsString(appId)};
const APP_SECRET = ${toJsString(secretPlaceholder)};

async function requestLicense(path: string, code: string, deviceFingerprint: string): Promise<LicenseData> {
  const response = await fetch(\`\${API_BASE_URL}\${path}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET,
      code,
      device_fingerprint: deviceFingerprint
    })
  });
  const payload = (await response.json()) as LicenseApiResponse;

  if (!payload.ok) {
    throw new Error(payload.error.message || payload.error.code);
  }

  return payload.data;
}

export function useLicense(deviceFingerprint: string) {
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activate = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestLicense("/api/client/activate", code, deviceFingerprint);
      setLicense(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "License request failed";
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [deviceFingerprint]);

  return { activate, license, error, loading };
}

export function LicenseScreen({ deviceFingerprint }: { deviceFingerprint: string }) {
  const [code, setCode] = useState("");
  const { activate, license, error, loading } = useLicense(deviceFingerprint);

  return (
    <View>
      {license?.valid ? (
        <Text>License valid until {license.expires_at ?? "never"}</Text>
      ) : (
        <>
          <TextInput value={code} onChangeText={setCode} placeholder="Activation code" autoCapitalize="characters" />
          <Button title={loading ? "Activating..." : "Activate"} disabled={loading} onPress={() => activate(code.trim())} />
          {error ? <Text accessibilityRole="alert">{error}</Text> : null}
        </>
      )}
    </View>
  );
}`;
}

function createAngularSdk(appId: string, apiBaseUrl: string, secretPlaceholder: string) {
  return `import { Component, Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

type LicenseData = {
  valid: boolean;
  device_bound: boolean;
  expires_at: string | null;
  remaining_seconds: number;
};

type LicenseApiResponse =
  | { ok: true; data: LicenseData }
  | { ok: false; error: { code: string; message: string } };

@Injectable({ providedIn: "root" })
export class LicenseService {
  private readonly apiBaseUrl = ${toJsString(apiBaseUrl)};
  private readonly appId = ${toJsString(appId)};
  private readonly appSecret = ${toJsString(secretPlaceholder)};

  constructor(private readonly http: HttpClient) {}

  activate(code: string, deviceFingerprint: string) {
    return this.request("/api/client/activate", code, deviceFingerprint);
  }

  verify(code: string, deviceFingerprint: string) {
    return this.request("/api/client/verify", code, deviceFingerprint);
  }

  async request(path: string, code: string, deviceFingerprint: string): Promise<LicenseData> {
    const payload = await firstValueFrom(
      this.http.post<LicenseApiResponse>(\`\${this.apiBaseUrl}\${path}\`, {
        app_id: this.appId,
        app_secret: this.appSecret,
        code,
        device_fingerprint: deviceFingerprint
      })
    );

    if (!payload.ok) {
      throw new Error(payload.error.message || payload.error.code);
    }

    return payload.data;
  }
}

@Component({
  selector: "app-license-gate",
  template: \`
    <section *ngIf="license()?.valid; else activationForm">
      License valid until {{ license()?.expires_at ?? "never" }}
    </section>
    <ng-template #activationForm>
      <form (ngSubmit)="activate()">
        <input name="code" [(ngModel)]="code" placeholder="Activation code" required />
        <button type="submit" [disabled]="loading()">{{ loading() ? "Activating..." : "Activate" }}</button>
        <p *ngIf="error()" role="alert">{{ error() }}</p>
      </form>
    </ng-template>
  \`
})
export class LicenseGateComponent {
  code = "";
  deviceFingerprint = "stable-device-id";
  license = signal<LicenseData | null>(null);
  error = signal<string | null>(null);
  loading = signal(false);

  constructor(private readonly licenseService: LicenseService) {}

  async activate() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.license.set(await this.licenseService.activate(this.code.trim(), this.deviceFingerprint));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : "License request failed");
    } finally {
      this.loading.set(false);
    }
  }
}`;
}

function createSvelteSdk(appId: string, apiBaseUrl: string, secretPlaceholder: string) {
  return `<script lang="ts">
  type LicenseData = {
    valid: boolean;
    device_bound: boolean;
    expires_at: string | null;
    remaining_seconds: number;
  };

  type LicenseApiResponse =
    | { ok: true; data: LicenseData }
    | { ok: false; error: { code: string; message: string } };

  const API_BASE_URL = ${toJsString(apiBaseUrl)};
  const APP_ID = ${toJsString(appId)};
  const APP_SECRET = ${toJsString(secretPlaceholder)};

  export let deviceFingerprint = "stable-device-id";

  let code = "";
  let license: LicenseData | null = null;
  let error: string | null = null;
  let loading = false;

  async function requestLicense(path: string, activationCode: string) {
    const response = await fetch(\`\${API_BASE_URL}\${path}\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: APP_ID,
        app_secret: APP_SECRET,
        code: activationCode,
        device_fingerprint: deviceFingerprint
      })
    });
    const payload = (await response.json()) as LicenseApiResponse;

    if (!payload.ok) {
      throw new Error(payload.error.message || payload.error.code);
    }

    return payload.data;
  }

  async function activate() {
    loading = true;
    error = null;
    try {
      license = await requestLicense("/api/client/activate", code.trim());
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : "License request failed";
    } finally {
      loading = false;
    }
  }
</script>

{#if license?.valid}
  <section>License valid until {license.expires_at ?? "never"}</section>
{:else}
  <form on:submit|preventDefault={activate}>
    <input bind:value={code} placeholder="Activation code" required />
    <button type="submit" disabled={loading}>{loading ? "Activating..." : "Activate"}</button>
    {#if error}<p role="alert">{error}</p>{/if}
  </form>
{/if}`;
}

function createElectronSdk(appId: string, apiBaseUrl: string, secretPlaceholder: string) {
  return `type LicenseData = {
  valid: boolean;
  device_bound: boolean;
  expires_at: string | null;
  remaining_seconds: number;
};

type LicenseApiResponse =
  | { ok: true; data: LicenseData }
  | { ok: false; error: { code: string; message: string } };

const API_BASE_URL = ${toJsString(apiBaseUrl)};
const APP_ID = ${toJsString(appId)};
const APP_SECRET = ${toJsString(secretPlaceholder)};

export async function requestLicense(path: string, code: string, deviceFingerprint: string): Promise<LicenseData> {
  const response = await fetch(\`\${API_BASE_URL}\${path}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET,
      code,
      device_fingerprint: deviceFingerprint
    })
  });
  const payload = (await response.json()) as LicenseApiResponse;

  if (!payload.ok) {
    throw new Error(payload.error.message || payload.error.code);
  }

  return payload.data;
}

export function activateLicense(code: string) {
  const deviceFingerprint = window.navigator.userAgent;
  return requestLicense("/api/client/activate", code, deviceFingerprint);
}

export function verifyLicense(code: string) {
  const deviceFingerprint = window.navigator.userAgent;
  return requestLicense("/api/client/verify", code, deviceFingerprint);
}`;
}

function createFlutterSdk(appId: string, apiBaseUrl: string, secretPlaceholder: string) {
  return `import 'dart:convert';
import 'package:http/http.dart' as http;

class LicenseClient {
  LicenseClient({
    this.apiBaseUrl = ${toDartString(apiBaseUrl)},
    this.appId = ${toDartString(appId)},
    this.appSecret = ${toDartString(secretPlaceholder)},
    http.Client? httpClient,
  }) : httpClient = httpClient ?? http.Client();

  final String apiBaseUrl;
  final String appId;
  final String appSecret;
  final http.Client httpClient;

  Future<Map<String, dynamic>> activate(String code, String deviceFingerprint) {
    return _request('/api/client/activate', code, deviceFingerprint);
  }

  Future<Map<String, dynamic>> verify(String code, String deviceFingerprint) {
    return _request('/api/client/verify', code, deviceFingerprint);
  }

  Future<Map<String, dynamic>> unbindDevice(String code, String deviceFingerprint) {
    return _request('/api/client/unbind-device', code, deviceFingerprint);
  }

  Future<Map<String, dynamic>> _request(String path, String code, String deviceFingerprint) async {
    final response = await httpClient.post(
      Uri.parse('\$apiBaseUrl\$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'app_id': appId,
        'app_secret': appSecret,
        'code': code,
        'device_fingerprint': deviceFingerprint,
      }),
    );
    final payload = jsonDecode(response.body) as Map<String, dynamic>;

    if (payload['ok'] != true) {
      final error = payload['error'] as Map<String, dynamic>?;
      throw Exception(error?['message'] ?? error?['code'] ?? 'License request failed');
    }

    return payload['data'] as Map<String, dynamic>;
  }
}`;
}

function toJsString(value: string) {
  return JSON.stringify(value);
}

function toDartString(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}
