import { Context, Next } from "hono";
import { requireEnv } from "./config";
import { verifyJwt } from "./crypto";
import { fail } from "./http";
import { Repository } from "./repository";
import { Bindings, Variables } from "./types";

export async function requireAdmin(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    return c.json(fail("UNAUTHORIZED", "Missing bearer token"), 401);
  }
  const payload = await verifyJwt(requireEnv(c.env, "JWT_SECRET"), token);
  if (!payload) {
    return c.json(fail("UNAUTHORIZED", "Invalid or expired token"), 401);
  }
  const repo = new Repository(c.env.DB);
  const admin = await repo.getAdminById(Number(payload.sub));
  if (!admin) {
    return c.json(fail("UNAUTHORIZED", "Admin no longer exists"), 401);
  }
  c.set("admin", {
    id: admin.id,
    username: admin.username
  });
  await next();
}
