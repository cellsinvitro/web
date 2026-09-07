import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { MaintenanceScope } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { findMatchingMaintenanceRule, isAdminRequest, normalizeMaintenancePath } from "../lib/maintenance.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const scopes = new Set<MaintenanceScope>(["WEB_PATH", "API_PATH"]);

function parseScope(value: unknown): MaintenanceScope {
  if (typeof value !== "string" || !scopes.has(value as MaintenanceScope)) {
    throw new HTTPException(400, { message: "Scope must be WEB_PATH or API_PATH" });
  }
  return value as MaintenanceScope;
}

function parseInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new HTTPException(400, { message: "Invalid maintenance rule" });
  }
  const input = body as Record<string, unknown>;
  const scope = parseScope(input.scope);
  let targetPath: string;
  try {
    targetPath = normalizeMaintenancePath(String(input.targetPath || ""), scope);
  } catch (error) {
    throw new HTTPException(400, { message: error instanceof Error ? error.message : "Invalid path" });
  }

  const message = input.message == null ? null : String(input.message).trim();
  if (message && message.length > 500) {
    throw new HTTPException(400, { message: "Message must be 500 characters or fewer" });
  }

  return {
    targetPath,
    scope,
    enabled: input.enabled === undefined ? true : Boolean(input.enabled),
    message: message || null,
  };
}

export const maintenanceRoutes = new Hono<{ Variables: AuthVariables }>();

maintenanceRoutes.get("/check", async (c) => {
  const scope = parseScope(c.req.query("scope"));
  const path = c.req.query("path") || "/";
  const rule = await findMatchingMaintenanceRule(scope, path);
  const blocked = Boolean(rule) && !(await isAdminRequest(c));
  return c.json({
    blocked,
    message: rule?.message || "This area is temporarily unavailable for maintenance.",
  });
});

export const adminMaintenanceRoutes = new Hono<{ Variables: AuthVariables }>();
adminMaintenanceRoutes.use("*", requireAuth, requireAdmin);

adminMaintenanceRoutes.get("/", async (c) => {
  const rules = await prisma.maintenanceRule.findMany({
    orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
  });
  return c.json({ rules });
});

adminMaintenanceRoutes.post("/", async (c) => {
  const input = parseInput(await c.req.json());
  const rule = await prisma.maintenanceRule.upsert({
    where: { scope_targetPath: { scope: input.scope, targetPath: input.targetPath } },
    create: { ...input, createdById: c.get("user").sub },
    update: input,
  });
  return c.json({ rule }, 201);
});

adminMaintenanceRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseInput(await c.req.json());
  const rule = await prisma.maintenanceRule.update({ where: { id }, data: input });
  return c.json({ rule });
});

adminMaintenanceRoutes.delete("/:id", async (c) => {
  await prisma.maintenanceRule.delete({ where: { id: c.req.param("id") } });
  return c.json({ success: true });
});