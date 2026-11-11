import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import {
  ALLOWED_BANNER_IMAGE_TYPES,
  buildLmsSettingsUpdate,
  deleteLocalBannerIfNeeded,
  getOrCreateLmsSettings,
  serializeLmsSettings,
  storeLmsBannerImage,
  type UpdateLmsSettingsInput,
} from "../lib/lms-master.js";

export const adminLmsRoutes = new Hono<{ Variables: AuthVariables }>();

adminLmsRoutes.use("*", requireAuth, requireAdmin);

const MAX_BANNER_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// GET /api/admin/lms/settings
adminLmsRoutes.get("/settings", async (c) => {
  const settings = await getOrCreateLmsSettings();
  return c.json({ settings: serializeLmsSettings(settings, true) });
});

// PUT /api/admin/lms/settings
adminLmsRoutes.put("/settings", async (c) => {
  const body = await c.req.json<UpdateLmsSettingsInput>();
  const existing = await getOrCreateLmsSettings();
  const updateData = buildLmsSettingsUpdate(body);

  if (body.bannerImageUrl === null && existing.bannerImageUrl) {
    await deleteLocalBannerIfNeeded(existing.bannerImageUrl);
  }

  const updated = await prisma.lmsSetting.update({
    where: { id: "default" },
    data: updateData,
  });

  return c.json({
    settings: serializeLmsSettings(updated, true),
    message: "LMS settings updated successfully.",
  });
});

// POST /api/admin/lms/banner-image - Upload & persist LMS master page banner image
adminLmsRoutes.post("/banner-image", async (c) => {
  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    throw new HTTPException(400, { message: "Multipart form data is required" });
  }

  const file = formData.get("file") || formData.get("image");
  if (!file || !(file instanceof File)) {
    throw new HTTPException(400, {
      message: "An image file ('file' or 'image') is required",
    });
  }

  if (file.size > MAX_BANNER_IMAGE_SIZE) {
    throw new HTTPException(413, {
      message: "Banner image must be under 10 MB",
    });
  }

  if (!ALLOWED_BANNER_IMAGE_TYPES.has(file.type)) {
    throw new HTTPException(415, {
      message: "Only JPEG, PNG, WEBP, GIF, and SVG images are allowed",
    });
  }

  const existing = await getOrCreateLmsSettings();
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await storeLmsBannerImage(file.name || "banner.png", file.type, buffer);

  if (existing.bannerImageUrl && existing.bannerImageUrl !== url) {
    await deleteLocalBannerIfNeeded(existing.bannerImageUrl);
  }

  const updated = await prisma.lmsSetting.update({
    where: { id: "default" },
    data: { bannerImageUrl: url },
  });

  return c.json({
    url,
    settings: serializeLmsSettings(updated, true),
    message: "Banner image uploaded and saved.",
  });
});

// DELETE /api/admin/lms/banner-image - Remove custom LMS banner image
adminLmsRoutes.delete("/banner-image", async (c) => {
  const existing = await getOrCreateLmsSettings();
  if (existing.bannerImageUrl) {
    await deleteLocalBannerIfNeeded(existing.bannerImageUrl);
  }

  const updated = await prisma.lmsSetting.update({
    where: { id: "default" },
    data: { bannerImageUrl: null },
  });

  return c.json({
    settings: serializeLmsSettings(updated, true),
    message: "Banner image removed.",
  });
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
