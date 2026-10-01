/**
 * EdgeOne Pages 边缘中间件（V8 运行时，无 Node API）。
 * 作用：SPA history 兜底 —— 非接口、非静态资源（无扩展名）的页面导航
 * 统一改写到 /index.html，由平台静态层直接返回，不消耗云函数调用。
 * 带扩展名的路径（如 /docs/*.md、/assets/*.js）原样放行走真实静态文件。
 */
export function middleware(context) {
  const { request, next, rewrite } = context;
  const { pathname } = new URL(request.url);
  if (pathname === "/" || pathname.startsWith("/api/")) {
    return next();
  }
  const accept = request.headers.get("accept") || "";
  const isPageNavigation =
    (request.method === "GET" || request.method === "HEAD") &&
    accept.includes("text/html") &&
    !/\.[a-zA-Z0-9]+$/.test(pathname);
  if (isPageNavigation) {
    return rewrite("/index.html");
  }
  return next();
}
