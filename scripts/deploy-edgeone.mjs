#!/usr/bin/env node
/**
 * EdgeOne 部署包装脚本：规避 `edgeone makers deploy` 与根目录 .env 双向同步的坑。
 *
 * 背景：deploy 会用根目录 .env 覆盖项目环境变量；若本地 .env 不存在或为空，
 * 远端环境变量会被**清空**（整站 API 报 500）。而 .env 残留又会在本地 Cloudflare dev 时
 * 覆盖 .dev.vars 的密钥。本脚本把「部署前保证 .env 有内容、部署后清理」固化成流程。
 *
 * 用法：
 *   node scripts/deploy-edgeone.mjs [--env-file=<path>] [--keep-env] [-- <edgeone deploy 参数>]
 * 环境变量来源优先级：
 *   1) --env-file 指定文件
 *   2) .edgeone/env.local（推荐：本地保存的 EdgeOne 项目密钥，勿提交）
 *   3) 已存在的根目录 .env
 *   4) `edgeone makers env pull` 从远端拉取
 */
import { existsSync, copyFileSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = join(ROOT, ".env");

const rawArgs = process.argv.slice(2);
const keepEnv = rawArgs.includes("--keep-env");
const envFileArg = rawArgs.find((arg) => arg.startsWith("--env-file="));
const deployArgs = rawArgs.filter((arg) => arg !== "--keep-env" && !arg.startsWith("--env-file="));

function countEnvEntries(path) {
  if (!existsSync(path)) {
    return 0;
  }
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("=")).length;
}

/**
 * 解析 edgeone CLI 调用方式：优先用 node 直调 npm 全局安装的 JS 入口，
 * 避免 Windows 上依赖 cmd.exe / shell 解析（沙箱环境常不可用）。
 */
function resolveEdgeoneCommand() {
  if (process.env.EDGEONE_BIN) {
    return { command: process.env.EDGEONE_BIN, prefix: [], shell: false };
  }
  const candidates = [
    join(process.env.APPDATA ?? "", "npm", "node_modules", "edgeone", "edgeone-bin", "edgeone.js"),
    join(process.env.HOME ?? "", ".npm-global", "lib", "node_modules", "edgeone", "edgeone-bin", "edgeone.js"),
    "/usr/local/lib/node_modules/edgeone/edgeone-bin/edgeone.js",
    "/usr/lib/node_modules/edgeone/edgeone-bin/edgeone.js"
  ];
  const entry = candidates.find((candidate) => candidate && existsSync(candidate));
  if (entry) {
    return { command: process.execPath, prefix: [entry], shell: false };
  }
  return { command: "edgeone", prefix: [], shell: process.platform === "win32" };
}

const EDGEONE = resolveEdgeoneCommand();

function runEdgeone(args) {
  return spawnSync(EDGEONE.command, [...EDGEONE.prefix, ...args], { cwd: ROOT, stdio: "inherit", shell: EDGEONE.shell });
}

function resolveEnvSource() {
  const explicit = envFileArg ? resolve(ROOT, envFileArg.slice("--env-file=".length)) : null;
  const candidates = [explicit, join(ROOT, ".edgeone", "env.local"), ENV_PATH].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate) && countEnvEntries(candidate) > 0) {
      return { path: candidate, entries: countEnvEntries(candidate) };
    }
  }
  return null;
}

let createdEnv = false;
const source = resolveEnvSource();
if (source) {
  if (source.path !== ENV_PATH) {
    copyFileSync(source.path, ENV_PATH);
    createdEnv = true;
  }
  console.log(`[deploy:edgeone] 使用环境变量来源 ${source.path}（${source.entries} 项）`);
} else {
  console.log("[deploy:edgeone] 本地无可用密钥文件，尝试 edgeone makers env pull 从远端拉取…");
  const pull = runEdgeone(["makers", "env", "pull"]);
  const entries = countEnvEntries(ENV_PATH);
  if (pull.status !== 0 || entries === 0) {
    console.error(
      "[deploy:edgeone] ❌ 无法获得非空 .env：直接部署会清空远端环境变量。\n" +
        "   请先执行 edgeone makers env pull，或用 --env-file=<path> 指定密钥文件（例如 .edgeone/env.local）。"
    );
    rmSync(ENV_PATH, { force: true });
    process.exit(1);
  }
  createdEnv = true;
  console.log(`[deploy:edgeone] 已从远端拉取 ${entries} 项环境变量`);
}

const deploy = runEdgeone(["makers", "deploy", ...deployArgs]);

if (createdEnv && !keepEnv) {
  rmSync(ENV_PATH, { force: true });
  console.log("[deploy:edgeone] 已删除根目录 .env（避免覆盖本地 Cloudflare dev 密钥；用 --keep-env 可保留）");
}
process.exit(deploy.status ?? 1);
