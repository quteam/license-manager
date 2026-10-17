import app from "./index";
import type { Bindings } from "./types";

/**
 * EdgeOne Pages 云函数入口（构建产物为 cloud-functions/api/[[default]].js）。
 * 平台按文件路径路由：该文件接管 /api/* 全部请求；
 * 非 /api 请求由平台静态层与根级 middleware.js 处理，不会进入本函数。
 */
type EdgeOneFunctionContext = {
  request: Request;
  env: Record<string, unknown>;
};

export async function onRequest(context: EdgeOneFunctionContext): Promise<Response> {
  // 未传第三参 execution context：本应用不使用 waitUntil，Hono 以可选项支持
  return app.fetch(context.request, context.env as unknown as Bindings);
}

export default onRequest;
