import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { deleteStoredStudyMaterial, isImageMimeType, storeStudyMaterialFile } from "../lib/study-materials.js";
import { requireAdmin } from "../middleware/admin.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const adminConsultancyRoutes = new Hono<{ Variables: AuthVariables }>();

adminConsultancyRoutes.use("*", requireAuth, requireAdmin);

function getApiBaseUrl(c: { req: { url: string } }) {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

function resolveConsultantPhotoUrl(photoUrl: string | null, apiBaseUrl: string) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://") || photoUrl.startsWith("/")) return photoUrl;
  return `${apiBaseUrl}/consultancy/images/${encodeURIComponent(photoUrl)}`;
}

function toPublicConsultant(consultant: any, apiBaseUrl: string) {
  return { ...consultant, photoUrl: resolveConsultantPhotoUrl(consultant.photoUrl, apiBaseUrl), consultationTypes: consultant.consultationTypes as string[] };
}

async function storeConsultantImage(image: File | null) {
  if (!image) return null;
  if (!isImageMimeType(image.type) || image.size <= 0 || image.size > 15 * 1024 * 1024) {
    throw new HTTPException(400, { message: "Consultant image must be a valid image up to 15 MB" });
  }
  return storeStudyMaterialFile(image.name, image.type, Buffer.from(await image.arrayBuffer()));
}

adminConsultancyRoutes.get("/consultancy/categories", async (c) => {
  const categories = await prisma.consultancyCategory.findMany({
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }],
    include: { consultants: true },
  });
  return c.json({ categories });
});

adminConsultancyRoutes.post("/consultancy/categories", async (c) => {
  const body = await c.req.json<{ name: string; description?: string; color?: string; published?: boolean; sortOrder?: number }>();
  const name = body.name?.trim();
  if (!name) throw new HTTPException(400, { message: "Category name is required" });

  const category = await prisma.consultancyCategory.create({
    data: {
      name,
      description: body.description?.trim() || null,
      color: body.color?.trim() || null,
      published: body.published ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return c.json({ category }, 201);
});

adminConsultancyRoutes.patch("/consultancy/categories/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const category = await prisma.consultancyCategory.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.description !== undefined ? { description: String(body.description).trim() || null } : {}),
      ...(body.color !== undefined ? { color: String(body.color).trim() || null } : {}),
      ...(body.published !== undefined ? { published: Boolean(body.published) } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
    },
  });
  return c.json({ category });
});

adminConsultancyRoutes.delete("/consultancy/categories/:id", async (c) => {
  const id = c.req.param("id");
  const category = await prisma.consultancyCategory.findUnique({
    where: { id },
    include: { consultants: true },
  });
  if (!category) throw new HTTPException(404, { message: "Category not found" });
  if (category.consultants.length > 0) {
    throw new HTTPException(400, { message: "Delete or reassign consultants before deleting this category" });
  }
  await prisma.consultancyCategory.delete({ where: { id } });
  return c.json({ success: true });
});

adminConsultancyRoutes.get("/consultancy/consultants", async (c) => {
  const consultants = await prisma.consultant.findMany({
    include: { category: true, slots: { orderBy: [{ date: "asc" as const }, { startTime: "asc" as const }] } },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }],
  });
  return c.json({ consultants: consultants.map((consultant: any) => toPublicConsultant(consultant, getApiBaseUrl(c))) });
});

adminConsultancyRoutes.post("/consultancy/consultants", async (c) => {
  const body = await c.req.parseBody();
  const image = body.image instanceof File ? body.image : null;
  const expertise = body.expertise ? String(body.expertise).split(",").map((item) => item.trim()).filter(Boolean) : [];
  const consultationTypes = body.consultationTypes ? String(body.consultationTypes).split(",").map((type) => type.trim().toUpperCase()).filter(Boolean) : ["VIDEO", "AUDIO"];
  const categoryId = String(body.categoryId ?? "");
  const name = String(body.name ?? "").trim();
  if (!categoryId || !name) throw new HTTPException(400, { message: "Category and consultant name are required" });
  const category = await prisma.consultancyCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new HTTPException(404, { message: "Category not found" });

  let storedPhotoKey: string | null = null;
  try {
    storedPhotoKey = await storeConsultantImage(image);
    const consultant = await prisma.consultant.create({
      data: {
        categoryId,
        name,
        title: String(body.title ?? "").trim() || null,
        photoUrl: storedPhotoKey,
        expertise,
        experienceYears: Number(body.experienceYears ?? 0),
        bio: String(body.bio ?? "").trim() || null,
        consultationTypes,
        durationMinutes: Number(body.durationMinutes ?? 60),
        hourlyRate: Number(body.hourlyRate ?? 0),
        currency: String(body.currency ?? "INR"),
        available: String(body.available ?? "true") !== "false",
        sortOrder: Number(body.sortOrder ?? 0),
      },
      include: { category: true, slots: true },
    });

    return c.json({ consultant: toPublicConsultant(consultant, getApiBaseUrl(c)) }, 201);
  } catch (error) {
    if (storedPhotoKey) await deleteStoredStudyMaterial(storedPhotoKey);
    throw error;
  }
});

adminConsultancyRoutes.patch("/consultancy/consultants/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const existing = await prisma.consultant.findUnique({ where: { id } });
  if (!existing) throw new HTTPException(404, { message: "Consultant not found" });
  const image = body.image instanceof File ? body.image : null;
  const storedPhotoKey = await storeConsultantImage(image);
  const consultant = await prisma.consultant.update({
    where: { id },
    data: {
      ...(body.categoryId !== undefined ? { categoryId: String(body.categoryId) } : {}),
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.title !== undefined ? { title: String(body.title).trim() || null } : {}),
      ...(storedPhotoKey ? { photoUrl: storedPhotoKey } : {}),
      ...(body.expertise !== undefined ? { expertise: String(body.expertise).split(",").map((item) => item.trim()).filter(Boolean) } : {}),
      ...(body.experienceYears !== undefined ? { experienceYears: Number(body.experienceYears) } : {}),
      ...(body.bio !== undefined ? { bio: String(body.bio).trim() || null } : {}),
      ...(body.consultationTypes !== undefined ? { consultationTypes: String(body.consultationTypes).split(",").map((type) => type.trim().toUpperCase()).filter(Boolean) } : {}),
      ...(body.durationMinutes !== undefined ? { durationMinutes: Number(body.durationMinutes) } : {}),
      ...(body.hourlyRate !== undefined ? { hourlyRate: Number(body.hourlyRate) } : {}),
      ...(body.currency !== undefined ? { currency: String(body.currency) } : {}),
      ...(body.available !== undefined ? { available: Boolean(body.available) } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
    },
    include: { category: true, slots: true },
  });
  if (storedPhotoKey && existing.photoUrl) await deleteStoredStudyMaterial(existing.photoUrl);
  return c.json({ consultant: toPublicConsultant(consultant, getApiBaseUrl(c)) });
});

adminConsultancyRoutes.delete("/consultancy/consultants/:id", async (c) => {
  const id = c.req.param("id");
  const consultant = await prisma.consultant.findUnique({ where: { id }, include: { bookings: true, slots: true } });
  if (!consultant) throw new HTTPException(404, { message: "Consultant not found" });
  if (consultant.bookings.length > 0 || consultant.slots.length > 0) {
    throw new HTTPException(400, { message: "Remove bookings and slots before deleting this consultant" });
  }
  await prisma.consultant.delete({ where: { id } });
  return c.json({ success: true });
});

adminConsultancyRoutes.post("/consultancy/consultants/:id/slots", async (c) => {
  const consultantId = c.req.param("id");
  const body = await c.req.json<{ date: string; startTime: string; endTime: string }>();
  if (!body.date || !body.startTime || !body.endTime) {
    throw new HTTPException(400, { message: "Date, start time and end time are required" });
  }

  const consultant = await prisma.consultant.findUnique({ where: { id: consultantId } });
  if (!consultant) throw new HTTPException(404, { message: "Consultant not found" });

  const slot = await prisma.consultantSlot.create({
    data: {
      consultantId,
      date: new Date(body.date),
      startTime: body.startTime,
      endTime: body.endTime,
    },
  });

  return c.json({ slot }, 201);
});

adminConsultancyRoutes.delete("/consultancy/slots/:id", async (c) => {
  const slot = await prisma.consultantSlot.findUnique({ where: { id: c.req.param("id") }, include: { bookings: true } });
  if (!slot) throw new HTTPException(404, { message: "Slot not found" });
  if (slot.bookings.length > 0) {
    throw new HTTPException(400, { message: "This slot has associated bookings and cannot be deleted" });
  }
  await prisma.consultantSlot.delete({ where: { id: slot.id } });
  return c.json({ success: true });
});

adminConsultancyRoutes.get("/consultancy/bookings", async (c) => {
  const bookings = await prisma.consultancyBooking.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      consultant: { include: { category: true } },
      category: true,
      slot: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return c.json({ bookings });
});

adminConsultancyRoutes.patch("/consultancy/bookings/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ status?: string }>();
  const status = body.status;
  if (!status) throw new HTTPException(400, { message: "Status is required" });

  const booking = await prisma.consultancyBooking.update({
    where: { id },
    data: { status: status as any },
    include: { slot: true },
  });

  if (status === "CANCELLED" && !booking.slot.isBooked) {
    await prisma.consultantSlot.update({ where: { id: booking.slotId }, data: { isBooked: false } });
  }

  return c.json({ booking });
});
