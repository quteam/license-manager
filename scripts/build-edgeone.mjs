import { build } from "esbuild";

/**
 * 构建 EdgeOne Pages 云函数产物：
 * worker/src/edgeone-entry.ts -> cloud-functions/api/[[default]].js
 * 全量打包（hono + @edgeone/pages-blob），运行时零外部依赖；
 * [[default]] 是 EdgeOne 的目录级 catch-all 约定，接管 /api/* 全部路由。
 */
await build({
  entryPoints: ["worker/src/edgeone-entry.ts"],
  outfile: "cloud-functions/api/[[default]].js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  sourcemap: false,
  minify: false,
  legalComments: "none",
  logLevel: "info"
});
