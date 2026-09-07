import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { getAccessTokenFromRequest } from "../lib/cookies.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { isAdminUser } from "../lib/admin.js";
import { prisma } from "../lib/prisma.js";
import { findMatchingMaintenanceRule } from "../lib/maintenance.js";

async function isAdminRequest(c: Context) {
  const token = getAccessTokenFromRequest(c);
  if (!token) return false;
  try {
    const payload = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { role: true } });
    return Boolean(user && isAdminUser(user));
  } catch {
    return false;
  }
}

export const maintenanceMiddleware = createMiddleware(async (c, next) => {
  const path = c.req.path;
  if (
    path === "/" ||
    path === "/health" ||
    path.startsWith("/health/") ||
    path.startsWith("/maintenance") ||
    path.startsWith("/admin/maintenance") ||
    path.startsWith("/webhooks") ||
    (await isAdminRequest(c))
  ) {
    await next();
    return;
  }

  const rule = await findMatchingMaintenanceRule("API_PATH", path);
  if (rule) {
    return c.json(
      { error: rule.message || "This endpoint is temporarily unavailable for maintenance." },
      503
    );
  }

  await next();
});