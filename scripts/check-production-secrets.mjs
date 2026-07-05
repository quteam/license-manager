import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const workerDir = join(rootDir, "worker");
const productionConfig = join(workerDir, "wrangler.production.toml");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const requiredSecrets = [
  "JWT_SECRET",
  "CODE_HMAC_SECRET",
  "APP_SECRET_HMAC_SECRET",
  "DEVICE_HMAC_SECRET",
  "ADMIN_BOOTSTRAP_PASSWORD"
];

if (!existsSync(productionConfig)) {
  console.error("worker/wrangler.production.toml does not exist. Copy worker/wrangler.production.example.toml first.");
  process.exit(1);
}

const result = spawnSync(
  pnpm,
  ["exec", "wrangler", "secret", "list", "--config", "wrangler.production.toml", "--env", "production", "--format", "json"],
  {
    cwd: workerDir,
    encoding: "utf8"
  }
);

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const configuredSecrets = parseSecretNames(result.stdout);
const missingSecrets = requiredSecrets.filter((secret) => !configuredSecrets.has(secret));

if (missingSecrets.length > 0) {
  console.error(`Missing production secrets: ${missingSecrets.join(", ")}`);
  process.exit(1);
}

console.log("Production secrets are configured.");

function parseSecretNames(stdout) {
  const value = JSON.parse(stdout);
  if (!Array.isArray(value)) {
    throw new Error("Unexpected wrangler secret list output");
  }
  return new Set(value.map((item) => item.name).filter((name) => typeof name === "string"));
}
