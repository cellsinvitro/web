import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const toolsRoutes = new Hono<{ Variables: AuthVariables }>();
const TOOL_KEYS = ["chatbot", "molarity", "ic50"] as const;
type ToolKey = (typeof TOOL_KEYS)[number];

function isToolKey(value: string): value is ToolKey {
  return TOOL_KEYS.includes(value as ToolKey);
}

async function ensureSettings() {
  await prisma.toolSetting.createMany({
    data: TOOL_KEYS.map((toolKey) => ({ toolKey, usageLimit: null })),
    skipDuplicates: true,
  });
  return prisma.toolSetting.findMany({ orderBy: { toolKey: "asc" } });
}

toolsRoutes.post("/usage/:toolKey/consume", requireAuth, async (c) => {
  const toolKey = c.req.param("toolKey");
  if (!isToolKey(toolKey)) throw new HTTPException(404, { message: "Tool not found" });
  const userId = c.get("user").sub;

  const result = await prisma.$transaction(async (transaction) => {
    const setting = await transaction.toolSetting.upsert({
      where: { toolKey },
      create: { toolKey, usageLimit: null },
      update: {},
    });
    const usage = await transaction.toolUsage.upsert({
      where: { userId_toolKey: { userId, toolKey } },
      create: { userId, toolKey, usageCount: 0 },
      update: {},
    });
    if (setting.usageLimit !== null && usage.usageCount >= setting.usageLimit) {
      return { allowed: false, limit: setting.usageLimit, used: usage.usageCount };
    }
    const updated = await transaction.toolUsage.update({
      where: { id: usage.id },
      data: { usageCount: { increment: 1 } },
    });
    return { allowed: true, limit: setting.usageLimit, used: updated.usageCount };
  });

  if (!result.allowed) throw new HTTPException(429, { message: `You have reached the ${toolKey} usage limit of ${result.limit}.` });
  return c.json(result);
});

toolsRoutes.get("/admin", requireAuth, requireAdmin, async (c) => {
  return c.json({ settings: await ensureSettings() });
});

toolsRoutes.patch("/admin/:toolKey", requireAuth, requireAdmin, async (c) => {
  const toolKey = c.req.param("toolKey");
  if (!isToolKey(toolKey)) throw new HTTPException(404, { message: "Tool not found" });
  const body = await c.req.json<{ usageLimit?: number | null | string }>();
  let usageLimit: number | null = null;
  if (body.usageLimit !== null && body.usageLimit !== undefined && body.usageLimit !== "") {
    const parsedLimit = Number(body.usageLimit);
    if (!Number.isFinite(parsedLimit) || !Number.isInteger(parsedLimit) || parsedLimit < 0) {
      throw new HTTPException(400, { message: "Usage limit must be a non-negative whole number or blank" });
    }
    usageLimit = parsedLimit;
  }
  const setting = await prisma.toolSetting.upsert({
    where: { toolKey },
    create: { toolKey, usageLimit },
    update: { usageLimit },
  });
  return c.json({ setting });
});