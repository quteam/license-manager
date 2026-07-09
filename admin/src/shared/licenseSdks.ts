import type { CodeLanguage } from "./CodeBlock";

type Translate = (key: string, values?: Record<string, string | number>) => string;

export type LicenseSdkEntry = {
  key: "typescript" | "react" | "vue" | "react-native";
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

type LicenseApiResponse =
  | { ok: true; data: LicenseData }
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
    return this.request("/api/client/activate", code, deviceFingerprint);
  }

  verify({ code, deviceFingerprint }: LicenseRequest) {
    return this.request("/api/client/verify", code, deviceFingerprint);
  }

  unbindDevice({ code, deviceFingerprint }: LicenseRequest) {
    return this.request("/api/client/unbind-device", code, deviceFingerprint);
  }

  private async request(path: string, code: string, deviceFingerprint: string): Promise<LicenseData> {
    const response = await fetch(\`\${this.config.apiBaseUrl}\${path}\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
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

function toJsString(value: string) {
  return JSON.stringify(value);
}
