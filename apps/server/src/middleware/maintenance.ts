import { createMiddleware } from "hono/factory";
import { findMatchingMaintenanceRule, isAdminRequest } from "../lib/maintenance.js";

export const maintenanceMiddleware = createMiddleware(async (c, next) => {
  const path = c.req.path;
  if (
    path === "/" ||
    path === "/health" ||
    path.startsWith("/health/") ||
    path.startsWith("/maintenance") ||
    path.startsWith("/admin/maintenance") ||
    path.startsWith("/webhooks")
  ) {
    await next();
    return;
  }

  const rule = await findMatchingMaintenanceRule("API_PATH", path);
  if (rule && !(await isAdminRequest(c))) {
    return c.json(
      { error: rule.message || "This endpoint is temporarily unavailable for maintenance." },
      503
    );
  }

  await next();
});