import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(rootDir, "worker", ".dev.vars");
const force = process.argv.includes("--force");

if (existsSync(envPath) && !force) {
  console.error("worker/.dev.vars already exists. Use `pnpm env:init -- --force` to replace it.");
  process.exit(1);
}

const vars = {
  JWT_SECRET: randomSecret(),
  CODE_HMAC_SECRET: randomSecret(),
  APP_SECRET_HMAC_SECRET: randomSecret(),
  DEVICE_HMAC_SECRET: randomSecret(),
  ADMIN_BOOTSTRAP_PASSWORD: randomSecret()
};

const contents = Object.entries(vars)
  .map(([key, value]) => `${key}="${value}"`)
  .join("\n");

writeFileSync(envPath, `${contents}\n`, { mode: 0o600 });
console.log(`Generated ${envPath}`);

function randomSecret() {
  return randomBytes(32).toString("hex");
}
