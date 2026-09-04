import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const cryoSearchRoutes = new Hono<{ Variables: AuthVariables }>();

cryoSearchRoutes.use("*", requireAuth);

const emptyState = {
  labs: [],
  activities: [],
  receivedRequests: [],
  sentRequests: [],
  allowedUsers: [],
};

cryoSearchRoutes.get("/state", async (c) => {
  const userId = c.get("user").sub;
  const state = await prisma.cryoSearchState.findUnique({ where: { userId } });

  return c.json(state ?? emptyState);
});

cryoSearchRoutes.put("/state", async (c) => {
  const userId = c.get("user").sub;
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    throw new HTTPException(400, { message: "Invalid CryoSearch state" });
  }

  const state = body as Record<string, unknown>;
  const data = {
    labs: state.labs ?? [],
    activities: state.activities ?? [],
    receivedRequests: state.receivedRequests ?? [],
    sentRequests: state.sentRequests ?? [],
    allowedUsers: state.allowedUsers ?? [],
  };

  const saved = await prisma.cryoSearchState.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return c.json(saved);
});