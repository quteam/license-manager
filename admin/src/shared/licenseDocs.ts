export type ClientAction = "activate" | "verify" | "unbind";

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

export const clientActions: ClientActionMeta[] = [
  {
    value: "activate",
    label: "激活",
    path: "/api/client/activate",
    description: "首次绑定激活码和设备，并返回授权有效期。"
  },
  {
    value: "verify",
    label: "校验",
    path: "/api/client/verify",
    description: "客户端启动或关键功能使用前校验激活码。"
  },
  {
    value: "unbind",
    label: "解绑",
    path: "/api/client/unbind-device",
    description: "旧设备解除当前绑定后，新设备可使用同一激活码重新激活。"
  }
];

export const clientActionFlows: Record<ClientAction, ClientFlowStep[]> = {
  activate: [
    { title: "客户端提交", detail: "传入 app_id、app_secret、激活码和设备指纹。" },
    { title: "校验应用", detail: "确认应用存在、状态可用且密钥匹配。" },
    { title: "校验激活码", detail: "检查激活码归属、删除、禁用、过期和设备绑定状态。" },
    { title: "绑定设备", detail: "首次激活写入设备哈希和有效期；已解绑激活码只重新绑定设备。" },
    { title: "返回授权", detail: "返回套餐、有效期、剩余秒数和绑定状态。" }
  ],
  verify: [
    { title: "客户端提交", detail: "传入 app_id、app_secret、激活码和当前设备指纹。" },
    { title: "校验应用", detail: "确认应用存在、状态可用且密钥匹配。" },
    { title: "校验状态", detail: "确认激活码已激活、未删除、未禁用且未过期。" },
    { title: "校验设备", detail: "设备哈希必须与当前绑定设备一致。" },
    { title: "返回授权", detail: "返回有效授权信息和当前绑定状态。" }
  ],
  unbind: [
    { title: "旧设备提交", detail: "旧设备传入 app_id、app_secret、激活码和当前设备指纹。" },
    { title: "校验应用", detail: "确认应用存在、状态可用且密钥匹配。" },
    { title: "校验激活码", detail: "确认激活码已激活、未删除、未禁用且未过期。" },
    { title: "校验解绑条件", detail: "当前设备必须匹配，且次数和频率未超过限制。" },
    { title: "清空绑定", detail: "清空设备哈希，保留原激活时间和过期时间。" },
    { title: "新设备激活", detail: "新设备继续调用激活接口完成重新绑定。" }
  ]
};

export const responseExample = `{
  "ok": true,
  "data": {
    "valid": true,
    "device_bound": true,
    "app_id": "app_xxx",
    "plan": {
      "code": "monthly",
      "name": "月卡",
      "duration_days": 30
    },
    "activated_at": "2026-06-25T08:00:00.000Z",
    "expires_at": "2026-07-25T08:00:00.000Z",
    "remaining_seconds": 2592000,
    "rebind_count": 0,
    "max_rebinds": 3
  }
}`;

export function getClientPath(action: ClientAction) {
  return clientActions.find((item) => item.value === action)?.path ?? "/api/client/activate";
}

export function createRequestPayload(action: ClientAction, appId: string) {
  const body =
    action === "unbind"
      ? {
          app_id: appId,
          app_secret: "替换为创建应用时保存的 app_secret",
          code: "LM-XXXXX-XXXXX-XXXXX-XXXXX",
          device_fingerprint: "stable-device-id"
        }
      : {
          app_id: appId,
          app_secret: "替换为创建应用时保存的 app_secret",
          code: "LM-XXXXX-XXXXX-XXXXX-XXXXX",
          device_fingerprint: "stable-device-id"
        };
  return JSON.stringify(body, null, 2);
}

export function createJavaScriptDemo(appId: string, apiBaseUrl: string) {
  return `const APP_ID = "${escapeJsString(appId)}";
const APP_SECRET = "替换为创建应用时保存的 app_secret";
const API_BASE_URL = "${escapeJsString(apiBaseUrl)}";

async function requestLicense(path, body) {
  const response = await fetch(\`\${API_BASE_URL}\${path}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET,
      ...body
    })
  });
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error?.message || payload.error?.code || "请求失败");
  }
  return payload.data;
}

export function activateLicense(code, deviceFingerprint) {
  return requestLicense("/api/client/activate", {
    code,
    device_fingerprint: deviceFingerprint
  });
}

export function verifyLicense(code, deviceFingerprint) {
  return requestLicense("/api/client/verify", {
    code,
    device_fingerprint: deviceFingerprint
  });
}

export function unbindDevice(code, deviceFingerprint) {
  return requestLicense("/api/client/unbind-device", {
    code,
    device_fingerprint: deviceFingerprint
  });
}`;
}

export function createCurlDemo(action: ClientAction, appId: string, apiBaseUrl: string) {
  return `curl -X POST '${escapeShellString(`${apiBaseUrl}${getClientPath(action)}`)}' \\
  -H 'Content-Type: application/json' \\
  --data '${escapeShellString(createRequestPayload(action, appId))}'`;
}

export function createHtmlDemo(appId: string, apiBaseUrl: string) {
  return `<!doctype html>
<html lang="zh-CN">
  <meta charset="utf-8" />
  <title>License Demo</title>
  <form id="license-form">
    <input name="app_secret" placeholder="app_secret" type="password" required />
    <input name="code" placeholder="激活码" required />
    <input name="device_fingerprint" placeholder="设备指纹" value="demo-device-001" required />
    <button type="submit">激活</button>
  </form>
  <pre id="result"></pre>
  <script>
    const APP_ID = "${escapeJsString(appId)}";
    const API_BASE_URL = "${escapeJsString(apiBaseUrl)}";

    document.querySelector("#license-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
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
      document.querySelector("#result").textContent = JSON.stringify(await response.json(), null, 2);
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
