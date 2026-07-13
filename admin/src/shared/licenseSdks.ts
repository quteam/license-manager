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

type AppInfoData = {
  app_id: string;
  name: string;
  description: string | null;
  purchase_url: string | null;
  platform: string;
  status: "active" | "disabled";
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

export async function getAppInfo(): Promise<AppInfoData> {
  const response = await fetch(\`\${API_BASE_URL}/api/client/app-info\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const payload = (await response.json()) as
    | { ok: true; data: AppInfoData }
    | { ok: false; error: { code: string; message: string } };

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

  const unbindDevice = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestLicense("/api/client/unbind-device", code, deviceFingerprint);
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

  return { activate, verify, unbindDevice, getAppInfo, license, error, loading };
}

export function LicenseGate({ deviceFingerprint }: { deviceFingerprint: string }) {
  const [code, setCode] = useState("");
  const [appInfo, setAppInfo] = useState<AppInfoData | null>(null);
  const [appInfoError, setAppInfoError] = useState<string | null>(null);
  const { activate, verify, unbindDevice, getAppInfo, license, error, loading } = useLicense(deviceFingerprint);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await activate(code.trim());
    } catch {}
  }

  async function handleLicenseAction(action: (activationCode: string) => Promise<LicenseData>) {
    try {
      await action(code.trim());
    } catch {}
  }

  async function handleAppInfo() {
    setAppInfoError(null);
    try {
      setAppInfo(await getAppInfo());
    } catch (requestError) {
      setAppInfoError(requestError instanceof Error ? requestError.message : "License request failed");
    }
  }

  return (
    <section>
      <form onSubmit={handleSubmit}>
        <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Activation code" required />
        <button type="submit" disabled={loading}>{loading ? "Activating..." : "Activate"}</button>
      </form>
      <p>
        <button type="button" disabled={loading || !code.trim()} onClick={() => void handleLicenseAction(verify)}>Verify</button>
        <button type="button" disabled={loading || !code.trim()} onClick={() => void handleLicenseAction(unbindDevice)}>Unbind device</button>
        <button type="button" disabled={loading} onClick={() => void handleAppInfo()}>Get app info</button>
      </p>
      {license?.valid ? <p>License valid until {license.expires_at ?? "never"}</p> : null}
      {appInfo ? <p>App: {appInfo.name} ({appInfo.platform})</p> : null}
      {error || appInfoError ? <p role="alert">{error || appInfoError}</p> : null}
    </section>
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

type AppInfoData = {
  app_id: string;
  name: string;
  description: string | null;
  purchase_url: string | null;
  platform: string;
  status: "active" | "disabled";
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
const appInfo = ref<AppInfoData | null>(null);
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

async function getAppInfo(): Promise<AppInfoData> {
  const response = await fetch(\`\${API_BASE_URL}/api/client/app-info\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const payload = (await response.json()) as
    | { ok: true; data: AppInfoData }
    | { ok: false; error: { code: string; message: string } };

  if (!payload.ok) {
    throw new Error(payload.error.message || payload.error.code);
  }

  return payload.data;
}

async function verifyLicense(activationCode: string) {
  return requestLicense("/api/client/verify", activationCode);
}

async function activateLicense(activationCode: string) {
  return requestLicense("/api/client/activate", activationCode);
}

async function unbindDevice(activationCode: string) {
  return requestLicense("/api/client/unbind-device", activationCode);
}

defineExpose({ activateLicense, verifyLicense, unbindDevice, getAppInfo });

async function runLicenseAction(action: (activationCode: string) => Promise<LicenseData>) {
  loading.value = true;
  error.value = null;
  try {
    license.value = await action(code.value.trim());
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : "License request failed";
  } finally {
    loading.value = false;
  }
}

async function activate() {
  await runLicenseAction(activateLicense);
}

async function verify() {
  await runLicenseAction(verifyLicense);
}

async function unbind() {
  await runLicenseAction(unbindDevice);
}

async function loadAppInfo() {
  loading.value = true;
  error.value = null;
  try {
    appInfo.value = await getAppInfo();
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
  <form @submit.prevent="activate">
    <input v-model="code" placeholder="Activation code" required />
    <button type="submit" :disabled="loading">
      {{ loading ? "Activating..." : "Activate" }}
    </button>
  </form>
  <p>
    <button type="button" :disabled="loading || !code.trim()" @click="verify">Verify</button>
    <button type="button" :disabled="loading || !code.trim()" @click="unbind">Unbind device</button>
    <button type="button" :disabled="loading" @click="loadAppInfo">Get app info</button>
  </p>
  <p v-if="appInfo">App: {{ appInfo.name }} ({{ appInfo.platform }})</p>
  <p v-if="error" role="alert">{{ error }}</p>
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

type AppInfoData = {
  app_id: string;
  name: string;
  description: string | null;
  purchase_url: string | null;
  platform: string;
  status: "active" | "disabled";
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

export async function getAppInfo(): Promise<AppInfoData> {
  const response = await fetch(\`\${API_BASE_URL}/api/client/app-info\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const payload = (await response.json()) as
    | { ok: true; data: AppInfoData }
    | { ok: false; error: { code: string; message: string } };

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

  const unbindDevice = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestLicense("/api/client/unbind-device", code, deviceFingerprint);
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

  return { activate, verify, unbindDevice, getAppInfo, license, error, loading };
}

export function LicenseScreen({ deviceFingerprint }: { deviceFingerprint: string }) {
  const [code, setCode] = useState("");
  const [appInfo, setAppInfo] = useState<AppInfoData | null>(null);
  const [appInfoError, setAppInfoError] = useState<string | null>(null);
  const { activate, verify, unbindDevice, getAppInfo, license, error, loading } = useLicense(deviceFingerprint);

  async function handleLicenseAction(action: (activationCode: string) => Promise<LicenseData>) {
    try {
      await action(code.trim());
    } catch {}
  }

  async function handleAppInfo() {
    setAppInfoError(null);
    try {
      setAppInfo(await getAppInfo());
    } catch (requestError) {
      setAppInfoError(requestError instanceof Error ? requestError.message : "License request failed");
    }
  }

  return (
    <View>
      <TextInput value={code} onChangeText={setCode} placeholder="Activation code" autoCapitalize="characters" />
      <Button title={loading ? "Activating..." : "Activate"} disabled={loading} onPress={() => void handleLicenseAction(activate)} />
      <Button title="Verify" disabled={loading || !code.trim()} onPress={() => void handleLicenseAction(verify)} />
      <Button title="Unbind device" disabled={loading || !code.trim()} onPress={() => void handleLicenseAction(unbindDevice)} />
      <Button title="Get app info" disabled={loading} onPress={() => void handleAppInfo()} />
      {license?.valid ? <Text>License valid until {license.expires_at ?? "never"}</Text> : null}
      {appInfo ? <Text>App: {appInfo.name} ({appInfo.platform})</Text> : null}
      {error || appInfoError ? <Text accessibilityRole="alert">{error || appInfoError}</Text> : null}
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

type AppInfoData = {
  app_id: string;
  name: string;
  description: string | null;
  purchase_url: string | null;
  platform: string;
  status: "active" | "disabled";
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

  unbindDevice(code: string, deviceFingerprint: string) {
    return this.request("/api/client/unbind-device", code, deviceFingerprint);
  }

  async getAppInfo(): Promise<AppInfoData> {
    const payload = await firstValueFrom(
      this.http.post<{ ok: true; data: AppInfoData } | { ok: false; error: { code: string; message: string } }>(
        \`\${this.apiBaseUrl}/api/client/app-info\`,
        { app_id: this.appId, app_secret: this.appSecret }
      )
    );

    if (!payload.ok) {
      throw new Error(payload.error.message || payload.error.code);
    }

    return payload.data;
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
    <section *ngIf="license()?.valid">
      License valid until {{ license()?.expires_at ?? "never" }}
    </section>
    <form (ngSubmit)="activate()">
      <input name="code" [(ngModel)]="code" placeholder="Activation code" required />
      <button type="submit" [disabled]="loading()">{{ loading() ? "Activating..." : "Activate" }}</button>
    </form>
    <p>
      <button type="button" [disabled]="loading() || !code.trim()" (click)="verify()">Verify</button>
      <button type="button" [disabled]="loading() || !code.trim()" (click)="unbindDevice()">Unbind device</button>
      <button type="button" [disabled]="loading()" (click)="loadAppInfo()">Get app info</button>
    </p>
    <p *ngIf="appInfo() as info">App: {{ info.name }} ({{ info.platform }})</p>
    <p *ngIf="error()" role="alert">{{ error() }}</p>
  \`
})
export class LicenseGateComponent {
  code = "";
  deviceFingerprint = "stable-device-id";
  license = signal<LicenseData | null>(null);
  appInfo = signal<AppInfoData | null>(null);
  error = signal<string | null>(null);
  loading = signal(false);

  constructor(private readonly licenseService: LicenseService) {}

  async activate() {
    await this.runLicenseAction(() => this.licenseService.activate(this.code.trim(), this.deviceFingerprint));
  }

  async verify() {
    await this.runLicenseAction(() => this.licenseService.verify(this.code.trim(), this.deviceFingerprint));
  }

  async unbindDevice() {
    await this.runLicenseAction(() => this.licenseService.unbindDevice(this.code.trim(), this.deviceFingerprint));
  }

  async loadAppInfo() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.appInfo.set(await this.licenseService.getAppInfo());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : "License request failed");
    } finally {
      this.loading.set(false);
    }
  }

  private async runLicenseAction(action: () => Promise<LicenseData>) {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.license.set(await action());
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

  type AppInfoData = {
    app_id: string;
    name: string;
    description: string | null;
    purchase_url: string | null;
    platform: string;
    status: "active" | "disabled";
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
  let appInfo: AppInfoData | null = null;
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

  export async function getAppInfo(): Promise<AppInfoData> {
    const response = await fetch(\`\${API_BASE_URL}/api/client/app-info\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    const payload = (await response.json()) as
      | { ok: true; data: AppInfoData }
      | { ok: false; error: { code: string; message: string } };

    if (!payload.ok) {
      throw new Error(payload.error.message || payload.error.code);
    }

    return payload.data;
  }

  export function verifyLicense(activationCode: string) {
    return requestLicense("/api/client/verify", activationCode);
  }

  export function activateLicense(activationCode: string) {
    return requestLicense("/api/client/activate", activationCode);
  }

  export function unbindDevice(activationCode: string) {
    return requestLicense("/api/client/unbind-device", activationCode);
  }

  async function runLicenseAction(action: (activationCode: string) => Promise<LicenseData>) {
    loading = true;
    error = null;
    try {
      license = await action(code.trim());
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : "License request failed";
    } finally {
      loading = false;
    }
  }

  async function activate() {
    await runLicenseAction(activateLicense);
  }

  async function verify() {
    await runLicenseAction(verifyLicense);
  }

  async function unbind() {
    await runLicenseAction(unbindDevice);
  }

  async function loadAppInfo() {
    loading = true;
    error = null;
    try {
      appInfo = await getAppInfo();
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : "License request failed";
    } finally {
      loading = false;
    }
  }
</script>

{#if license?.valid}
  <section>License valid until {license.expires_at ?? "never"}</section>
{/if}
<form on:submit|preventDefault={activate}>
  <input bind:value={code} placeholder="Activation code" required />
  <button type="submit" disabled={loading}>{loading ? "Activating..." : "Activate"}</button>
</form>
<p>
  <button type="button" disabled={loading || !code.trim()} on:click={verify}>Verify</button>
  <button type="button" disabled={loading || !code.trim()} on:click={unbind}>Unbind device</button>
  <button type="button" disabled={loading} on:click={loadAppInfo}>Get app info</button>
</p>
{#if appInfo}<p>App: {appInfo.name} ({appInfo.platform})</p>{/if}
{#if error}<p role="alert">{error}</p>{/if}`;
}

function createElectronSdk(appId: string, apiBaseUrl: string, secretPlaceholder: string) {
  return `type LicenseData = {
  valid: boolean;
  device_bound: boolean;
  expires_at: string | null;
  remaining_seconds: number;
};

type AppInfoData = {
  app_id: string;
  name: string;
  description: string | null;
  purchase_url: string | null;
  platform: string;
  status: "active" | "disabled";
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

export async function getAppInfo(): Promise<AppInfoData> {
  const response = await fetch(\`\${API_BASE_URL}/api/client/app-info\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const payload = (await response.json()) as
    | { ok: true; data: AppInfoData }
    | { ok: false; error: { code: string; message: string } };

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
}

export function unbindDevice(code: string) {
  const deviceFingerprint = window.navigator.userAgent;
  return requestLicense("/api/client/unbind-device", code, deviceFingerprint);
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

  Future<Map<String, dynamic>> getAppInfo() async {
    final response = await httpClient.post(
      Uri.parse('\$apiBaseUrl/api/client/app-info'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'app_id': appId, 'app_secret': appSecret}),
    );
    final payload = jsonDecode(response.body) as Map<String, dynamic>;

    if (payload['ok'] != true) {
      final error = payload['error'] as Map<String, dynamic>?;
      throw Exception(error?['message'] ?? error?['code'] ?? 'License request failed');
    }

    return payload['data'] as Map<String, dynamic>;
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
