import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { publicUserSelect, toPublicUser } from "../lib/user.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

type UpdateUserBody = {
  role?: "USER" | "ADMIN";
};

export const adminRoutes = new Hono<{ Variables: AuthVariables }>();

adminRoutes.use("*", requireAuth, requireAdmin);

adminRoutes.get("/stats", async (c) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, googleUsers, recentSignups] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { googleId: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
  ]);

  return c.json({
    stats: {
      totalUsers,
      emailUsers: totalUsers - googleUsers,
      googleUsers,
      recentSignups,
    },
  });
});

adminRoutes.get("/users", async (c) => {
  const users = await prisma.user.findMany({
    select: {
      ...publicUserSelect,
      googleId: true,
      passwordHash: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({
    users: users.map((user) => ({
      ...toPublicUser(user),
      authProvider: user.googleId ? "google" : "email",
      hasPassword: Boolean(user.passwordHash),
    })),
  });
});

adminRoutes.patch("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as UpdateUserBody;
  const currentUser = c.get("user");

  if (body.role !== "USER" && body.role !== "ADMIN") {
    throw new HTTPException(400, { message: "Invalid role" });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!target) {
    throw new HTTPException(404, { message: "User not found" });
  }

  if (userId === currentUser.sub && body.role === "USER") {
    throw new HTTPException(400, {
      message: "You cannot remove your own admin access",
    });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: body.role },
    select: publicUserSelect,
  });

  return c.json({ user: toPublicUser(updated) });
});

adminRoutes.delete("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const currentUser = c.get("user");

  if (userId === currentUser.sub) {
    throw new HTTPException(400, { message: "You cannot delete your own account" });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!target) {
    throw new HTTPException(404, { message: "User not found" });
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new HTTPException(400, {
        message: "Cannot delete the last admin account",
      });
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  return c.json({ success: true });
});
