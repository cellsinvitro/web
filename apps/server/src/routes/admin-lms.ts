import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const adminLmsRoutes = new Hono<{ Variables: AuthVariables }>();

adminLmsRoutes.use("*", requireAuth, requireAdmin);

// Helper to ensure default LmsSetting exists
async function getOrCreateLmsSettings() {
  let settings = await prisma.lmsSetting.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.lmsSetting.create({
      data: {
        id: "default",
        repoPrice: 149900,
        stockPrice: 149900,
        budgetPrice: 149900,
        logbookPrice: 199900,
        twoSectionDiscountPct: 15,
        threeSectionDiscountPct: 25,
        fullAccessPrice: 399900,
        currency: "INR",
      },
    });
  }
  return settings;
}

// GET /api/admin/lms/settings
adminLmsRoutes.get("/settings", async (c) => {
  const settings = await getOrCreateLmsSettings();
  return c.json({ settings });
});

// PUT /api/admin/lms/settings
adminLmsRoutes.put("/settings", async (c) => {
  const body = await c.req.json<{
    repoPrice?: number;
    stockPrice?: number;
    budgetPrice?: number;
    logbookPrice?: number;
    twoSectionDiscountPct?: number;
    threeSectionDiscountPct?: number;
    fullAccessPrice?: number;
    currency?: string;
  }>();

  await getOrCreateLmsSettings();

  const updated = await prisma.lmsSetting.update({
    where: { id: "default" },
    data: {
      ...(typeof body.repoPrice === "number" ? { repoPrice: body.repoPrice } : {}),
      ...(typeof body.stockPrice === "number" ? { stockPrice: body.stockPrice } : {}),
      ...(typeof body.budgetPrice === "number" ? { budgetPrice: body.budgetPrice } : {}),
      ...(typeof body.logbookPrice === "number" ? { logbookPrice: body.logbookPrice } : {}),
      ...(typeof body.twoSectionDiscountPct === "number"
        ? { twoSectionDiscountPct: body.twoSectionDiscountPct }
        : {}),
      ...(typeof body.threeSectionDiscountPct === "number"
        ? { threeSectionDiscountPct: body.threeSectionDiscountPct }
        : {}),
      ...(typeof body.fullAccessPrice === "number"
        ? { fullAccessPrice: body.fullAccessPrice }
        : {}),
      ...(body.currency ? { currency: body.currency } : {}),
    },
  });

  return c.json({ settings: updated, message: "LMS settings updated successfully." });
});

// GET /api/admin/lms/users - List users with LMS accesses
adminLmsRoutes.get("/users", async (c) => {
  const query = c.req.query("search")?.trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lmsAccesses: {
        select: {
          id: true,
          section: true,
          grantedBy: true,
          createdAt: true,
        },
      },
    },
  });

  return c.json({ users });
});

// POST /api/admin/lms/grant-access - Grant or revoke LMS section access
adminLmsRoutes.post("/grant-access", async (c) => {
  const body = await c.req.json<{
    userId: string;
    section: string;
    action: "GRANT" | "REVOKE";
  }>();

  if (!body.userId || !body.section || !body.action) {
    throw new HTTPException(400, { message: "userId, section, and action ('GRANT' | 'REVOKE') are required." });
  }

  const user = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!user) throw new HTTPException(404, { message: "User not found." });

  if (body.action === "GRANT") {
    const targetSections =
      body.section === "lms_full"
        ? ["lms_repo", "lms_stock", "lms_budget", "lms_logbook", "lms_full"]
        : [body.section];

    for (const sec of targetSections) {
      await prisma.lmsAccess.upsert({
        where: { userId_section: { userId: body.userId, section: sec } },
        create: { userId: body.userId, section: sec, grantedBy: "ADMIN" },
        update: { grantedBy: "ADMIN" },
      });
    }

    return c.json({ success: true, message: `Access granted for section '${body.section}'.` });
  } else {
    // REVOKE
    if (body.section === "lms_full") {
      await prisma.lmsAccess.deleteMany({ where: { userId: body.userId } });
    } else {
      await prisma.lmsAccess.deleteMany({
        where: { userId: body.userId, section: { in: [body.section, "lms_full"] } },
      });
    }

    return c.json({ success: true, message: `Access revoked for section '${body.section}'.` });
  }
});

// GET /api/admin/lms/payments - List LMS section payments
adminLmsRoutes.get("/payments", async (c) => {
  const payments = await prisma.payment.findMany({
    where: { lmsSections: { isEmpty: false } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return c.json({ payments });
});
