export type ClientAction = "app-info" | "activate" | "verify" | "unbind";

export type ClientActionMeta = {
  value: ClientAction;
  label: string;
  path: string;
  description: string;
};

export type ClientFlowStep = {
  title: string;
  detail: string;
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

export function getClientActions(t: Translate): ClientActionMeta[] {
  return [
  {
    value: "app-info",
    label: t("docs.actionAppInfo"),
    path: "/api/client/app-info",
    description: t("docs.actionAppInfoDesc")
  },
  {
    value: "activate",
    label: t("docs.actionActivate"),
    path: "/api/client/activate",
    description: t("docs.actionActivateDesc")
  },
  {
    value: "verify",
    label: t("docs.actionVerify"),
    path: "/api/client/verify",
    description: t("docs.actionVerifyDesc")
  },
  {
    value: "unbind",
    label: t("docs.actionUnbind"),
    path: "/api/client/unbind-device",
    description: t("docs.actionUnbindDesc")
  }
  ];
}

export function getClientActionFlows(t: Translate): Record<ClientAction, ClientFlowStep[]> {
  return {
  "app-info": [
    { title: t("docs.submitClient"), detail: t("docs.submitClientAppInfo") },
    { title: t("docs.verifyApp"), detail: t("docs.verifyAppDesc") },
    { title: t("docs.returnAppInfo"), detail: t("docs.returnAppInfoDesc") }
  ],
  activate: [
    { title: t("docs.submitClient"), detail: t("docs.submitClientActivate") },
    { title: t("docs.verifyApp"), detail: t("docs.verifyAppDesc") },
    { title: t("docs.verifyCode"), detail: t("docs.verifyCodeActivateDesc") },
    { title: t("docs.bindDevice"), detail: t("docs.bindDeviceDesc") },
    { title: t("docs.returnLicense"), detail: t("docs.returnLicenseActivateDesc") }
  ],
  verify: [
    { title: t("docs.submitClient"), detail: t("docs.submitClientVerify") },
    { title: t("docs.verifyApp"), detail: t("docs.verifyAppDesc") },
    { title: t("docs.verifyStatus"), detail: t("docs.verifyStatusDesc") },
    { title: t("docs.verifyDevice"), detail: t("docs.verifyDeviceDesc") },
    { title: t("docs.returnLicense"), detail: t("docs.returnLicenseVerifyDesc") }
  ],
  unbind: [
    { title: t("docs.submitOldDevice"), detail: t("docs.submitOldDeviceDesc") },
    { title: t("docs.verifyApp"), detail: t("docs.verifyAppDesc") },
    { title: t("docs.verifyCode"), detail: t("docs.verifyCodeUnbindDesc") },
    { title: t("docs.verifyUnbind"), detail: t("docs.verifyUnbindDesc") },
    { title: t("docs.clearBinding"), detail: t("docs.clearBindingDesc") },
    { title: t("docs.activateNewDevice"), detail: t("docs.activateNewDeviceDesc") }
  ]
};
}

export const clientActions = getClientActions((key) => key);

export function createResponseExample(t: Translate) {
  return `{
  "ok": true,
  "data": {
    "valid": true,
    "device_bound": true,
    "app_id": "app_xxx",
    "plan": {
      "code": "monthly",
      "name": "${escapeJsString(t("docs.responsePlanName"))}",
      "duration_days": 30
    },
    "activated_at": "2026-06-25T08:00:00.000Z",
    "expires_at": "2026-07-25T08:00:00.000Z",
    "remaining_seconds": 2592000,
    "rebind_count": 0,
    "max_rebinds": 3
  }
}`;
}

export function getClientPath(action: ClientAction) {
  return clientActions.find((item) => item.value === action)?.path ?? "/api/client/activate";
}

export function createRequestPayload(action: ClientAction, appId: string, t?: Translate) {
  const secretPlaceholder = t ? t("docs.secretPlaceholder") : "替换为创建应用时保存的 app_secret";
  const body =
    action === "app-info"
      ? {
          app_id: appId,
          app_secret: secretPlaceholder
        }
      : {
          app_id: appId,
          app_secret: secretPlaceholder,
          code: "LM-XXXXX-XXXXX-XXXXX-XXXXX",
          device_fingerprint: "stable-device-id"
        };
  return JSON.stringify(body, null, 2);
}

export function createJavaScriptDemo(appId: string, apiBaseUrl: string, t?: Translate) {
  return `const APP_ID = "${escapeJsString(appId)}";
const APP_SECRET = "${escapeJsString(t ? t("docs.secretPlaceholder") : "替换为创建应用时保存的 app_secret")}";
const API_BASE_URL = "${escapeJsString(apiBaseUrl)}";
const ERROR_FALLBACK = "${escapeJsString(t ? t("docs.errorFallback") : "请求失败")}";

class LicenseApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LicenseApiError";
    this.code = code;
  }
}

async function requestClient(path, body = {}) {
  let response;
  try {
    response = await fetch(\`\${API_BASE_URL}\${path}\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: APP_ID,
        app_secret: APP_SECRET,
        ...body
      })
    });
  } catch {
    throw new LicenseApiError("NETWORK_ERROR", ERROR_FALLBACK);
  }

  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object" || payload.ok !== true) {
    const error = payload && typeof payload === "object" ? payload.error : null;
    throw new LicenseApiError(error?.code || "REQUEST_FAILED", error?.message || ERROR_FALLBACK);
  }

  return payload.data;
}

export function activateLicense(code, deviceFingerprint) {
  return requestClient("/api/client/activate", {
    code,
    device_fingerprint: deviceFingerprint
  });
}

export function verifyLicense(code, deviceFingerprint) {
  return requestClient("/api/client/verify", {
    code,
    device_fingerprint: deviceFingerprint
  });
}

export function getAppInfo() {
  return requestClient("/api/client/app-info");
}

export function unbindDevice(code, deviceFingerprint) {
  return requestClient("/api/client/unbind-device", {
    code,
    device_fingerprint: deviceFingerprint
  });
}`;
}

export function createTypeScriptDemo(appId: string, apiBaseUrl: string, t?: Translate) {
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

type LicenseApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

type LicenseApiResponse<T> = { ok: true; data: T } | LicenseApiFailure;

export type LicenseClientConfig = {
  apiBaseUrl: string;
  appId: string;
  appSecret: string;
};

export class LicenseApiError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "LicenseApiError";
  }
}

export class LicenseClient {
  constructor(private readonly config: LicenseClientConfig) {}

  activateLicense(code: string, deviceFingerprint: string) {
    return this.request<LicenseData>("/api/client/activate", {
      code,
      device_fingerprint: deviceFingerprint
    });
  }

  verifyLicense(code: string, deviceFingerprint: string) {
    return this.request<LicenseData>("/api/client/verify", {
      code,
      device_fingerprint: deviceFingerprint
    });
  }

  unbindDevice(code: string, deviceFingerprint: string) {
    return this.request<LicenseData>("/api/client/unbind-device", {
      code,
      device_fingerprint: deviceFingerprint
    });
  }

  getAppInfo() {
    return this.request<AppInfoData>("/api/client/app-info");
  }

  private async request<T>(path: string, body: Record<string, string> = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(\`\${this.config.apiBaseUrl}\${path}\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
          ...body
        })
      });
    } catch {
      throw new LicenseApiError("NETWORK_ERROR", "${escapeJsString(t ? t("docs.errorFallback") : "请求失败")}");
    }

    const payload = (await response.json().catch(() => null)) as LicenseApiResponse<T> | null;
    if (!payload || !payload.ok) {
      const error = payload && "error" in payload ? payload.error : undefined;
      throw new LicenseApiError(error?.code || "REQUEST_FAILED", error?.message || "${escapeJsString(t ? t("docs.errorFallback") : "请求失败")}");
    }

    return payload.data;
  }
}

export const licenseClient = new LicenseClient({
  apiBaseUrl: "${escapeJsString(apiBaseUrl)}",
  appId: "${escapeJsString(appId)}",
  appSecret: "${escapeJsString(t ? t("docs.secretPlaceholder") : "替换为创建应用时保存的 app_secret")}"
});`;
}

export function createCurlDemo(action: ClientAction, appId: string, apiBaseUrl: string, t?: Translate) {
  return `curl -X POST '${escapeShellString(`${apiBaseUrl}${getClientPath(action)}`)}' \\
  -H 'Content-Type: application/json' \\
  --data '${escapeShellString(createRequestPayload(action, appId, t))}'`;
}

export function createHtmlDemo(appId: string, apiBaseUrl: string, t?: Translate) {
  const language = t?.("common.language") === "Language" ? "en" : "zh-CN";
  return `<!doctype html>
<html lang="${language}">
  <meta charset="utf-8" />
  <title>License Demo</title>
  <form id="license-form">
    <input name="app_secret" placeholder="app_secret" type="password" required />
    <input name="code" placeholder="${escapeJsString(t ? t("docs.codePlaceholder") : "激活码")}" required />
    <input name="device_fingerprint" placeholder="${escapeJsString(t ? t("docs.devicePlaceholder") : "设备指纹")}" value="demo-device-001" required />
    <button type="submit">${escapeJsString(t ? t("docs.activateButton") : "激活")}</button>
  </form>
  <pre id="result"></pre>
  <script>
    const APP_ID = "${escapeJsString(appId)}";
    const API_BASE_URL = "${escapeJsString(apiBaseUrl)}";

    const result = document.querySelector("#result");

    document.querySelector("#license-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      result.textContent = "";
      try {
        const response = await fetch(\`\${API_BASE_URL}/api/client/activate\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_id: APP_ID,
            app_secret: form.get("app_secret"),
            code: form.get("code"),
            device_fingerprint: form.get("device_fingerprint")
          })
        });
        const payload = await response.json().catch(() => null);
        result.textContent = JSON.stringify(payload ?? { ok: false, error: { code: "REQUEST_FAILED" } }, null, 2);
      } catch {
        result.textContent = JSON.stringify({ ok: false, error: { code: "NETWORK_ERROR" } }, null, 2);
      }
    });
  </script>
</html>`;
}

function escapeJsString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeShellString(value: string) {
  return value.replace(/'/g, "'\\''");
}
