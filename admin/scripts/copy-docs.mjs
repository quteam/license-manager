import { cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 把根目录 docs/ 复制进 admin 构建产物（后台内置文档功能使用）。
 * 取代原 Windows 专用 xcopy，保证 Cloudflare/EdgeOne（Linux 构建机）双平台可用。
 */
const here = dirname(fileURLToPath(import.meta.url));
const adminDir = dirname(here);
const source = join(adminDir, "..", "docs");
const target = join(adminDir, "dist", "docs");

if (!existsSync(source)) {
  console.warn(`[copy-docs] docs directory not found: ${source}`);
  process.exit(0);
}
cpSync(source, target, { recursive: true });
console.log(`[copy-docs] copied ${source} -> ${target}`);
