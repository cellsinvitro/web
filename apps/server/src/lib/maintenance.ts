import type { Context } from "hono";
import type { MaintenanceScope } from "../generated/prisma/client.js";
import { isAdminUser } from "./admin.js";
import { getAccessTokenFromRequest } from "./cookies.js";
import { verifyAccessToken } from "./jwt.js";
import { prisma } from "./prisma.js";

export type MaintenanceRuleInput = {
  targetPath: string;
  scope: MaintenanceScope;
  enabled?: boolean;
  message?: string | null;
};

export function normalizeMaintenancePath(value: string, scope: MaintenanceScope) {
  const input = value.trim();
  if (!input) throw new Error("A website link or path is required");

  let pathname: string;
  try {
    pathname = input.startsWith("/")
      ? new URL(input, "http://localhost").pathname
      : new URL(input).pathname;
  } catch {
    throw new Error("Enter a valid website link or path");
  }

  if (scope === "API_PATH" && (pathname === "/api" || pathname.startsWith("/api/"))) {
    pathname = pathname.slice(4) || "/";
  }

  pathname = `/${pathname.replace(/^\/+|\/+$/g, "")}`;
  return pathname === "/" ? pathname : pathname.replace(/\/+/g, "/");
}

export function matchesMaintenancePath(targetPath: string, requestPath: string) {
  const normalizedRequest = `/${requestPath.replace(/^\/+|\/+$/g, "")}`;
  return normalizedRequest === targetPath || normalizedRequest.startsWith(`${targetPath}/`);
}

export async function findMatchingMaintenanceRule(
  scope: MaintenanceScope,
  requestPath: string
) {
  const rules = await prisma.maintenanceRule.findMany({
    where: { scope, enabled: true },
    orderBy: { targetPath: "desc" },
  });

  return rules.find((rule) => matchesMaintenancePath(rule.targetPath, requestPath)) ?? null;
}

export async function isAdminRequest(c: Context) {
  const token = getAccessTokenFromRequest(c);
  if (!token) return false;
  try {
    const payload = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true },
    });
    return Boolean(user && isAdminUser(user));
  } catch {
    return false;
  }
}