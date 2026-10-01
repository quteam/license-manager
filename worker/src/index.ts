import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createApi } from "./routes";
import { fail } from "./http";
import { ApiError, Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.route("/api", createApi());

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return jsonError(error.status, fail(error.code, error.message));
  }
  if (error instanceof HTTPException) {
    return jsonError(error.status, fail("BAD_REQUEST", error.message));
  }
  console.error(error);
  return jsonError(500, fail("CONFLICT", "Unexpected server error"));
});

app.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json(fail("NOT_FOUND", "API route not found"), 404);
  }
  // EdgeOne 部署时没有 ASSETS 绑定：静态请求由平台静态层 + middleware 处理
  if (c.env.ASSETS && typeof c.env.ASSETS.fetch === "function") {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.json(fail("NOT_FOUND", "Resource not found"), 404);
});

export default app;

function jsonError(status: number, payload: ReturnType<typeof fail>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
