import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { getCloudinaryImageUrl, getCloudinaryPublicId, isCloudinaryStorageKey } from "../lib/cloudinary.js";
import { readStudyMaterialFile } from "../lib/study-materials.js";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyRazorpaySignature,
} from "../lib/razorpay.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const consultantInclude = {
  category: true,
  slots: {
    orderBy: [{ date: "asc" as const }, { startTime: "asc" as const }],
  },
};

export const consultancyRoutes = new Hono<{ Variables: AuthVariables }>();

function getApiBaseUrl(c: { req: { url: string } }) {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

function resolveConsultantPhotoUrl(photoUrl: string | null, apiBaseUrl: string) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://") || photoUrl.startsWith("/")) return photoUrl;
  if (isCloudinaryStorageKey(photoUrl)) return getCloudinaryImageUrl(getCloudinaryPublicId(photoUrl));
  return `${apiBaseUrl}/consultancy/images/${encodeURIComponent(photoUrl)}`;
}

function toPublicConsultant(consultant: any, apiBaseUrl: string) {
  return {
    ...consultant,
    photoUrl: resolveConsultantPhotoUrl(consultant.photoUrl, apiBaseUrl),
    consultationTypes: consultant.consultationTypes as string[],
  };
}

consultancyRoutes.use("*", requireAuth);

consultancyRoutes.get("/categories", async (c) => {
  const categories = await prisma.consultancyCategory.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return c.json({ categories });
});

consultancyRoutes.get("/consultants", async (c) => {
  const categoryId = c.req.query("categoryId") || undefined;

  const consultants = await prisma.consultant.findMany({
    where: {
      available: true,
      ...(categoryId ? { categoryId } : {}),
      category: { published: true },
    },
    include: consultantInclude,
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }],
  });

  return c.json({ consultants: consultants.map((consultant: any) => ({
    ...toPublicConsultant(consultant, getApiBaseUrl(c)),
    slots: consultant.slots.filter((slot: any) => !slot.isBooked),
  })) });
});

consultancyRoutes.get("/images/:storageKey", async (c) => {
  const storageKey = decodeURIComponent(c.req.param("storageKey"));
  if (isCloudinaryStorageKey(storageKey)) throw new HTTPException(404, { message: "Consultant image not found" });
  let fileData: Buffer;
  try { fileData = await readStudyMaterialFile(storageKey); } catch { throw new HTTPException(404, { message: "Consultant image not found" }); }
  const extension = storageKey.split(".").pop()?.toLowerCase();
  const mimeType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : extension === "gif" ? "image/gif" : "image/jpeg";
  return new Response(fileData, { headers: { "Content-Type": mimeType, "Content-Disposition": "inline", "Cache-Control": "public, max-age=86400" } });
});

consultancyRoutes.get("/consultants/:id", async (c) => {
  const consultant = await prisma.consultant.findUnique({
    where: { id: c.req.param("id") },
    include: consultantInclude,
  });

  if (!consultant) throw new HTTPException(404, { message: "Consultant not found" });
  if (!consultant.available) throw new HTTPException(404, { message: "Consultant unavailable" });

  return c.json({
    consultant: {
      ...toPublicConsultant(consultant, getApiBaseUrl(c)),
      slots: consultant.slots.filter((slot: any) => !slot.isBooked),
    },
  });
});

consultancyRoutes.get("/consultants/:id/slots", async (c) => {
  const consultantId = c.req.param("id");
  const date = c.req.query("date");

  const consultant = await prisma.consultant.findUnique({ where: { id: consultantId } });
  if (!consultant) throw new HTTPException(404, { message: "Consultant not found" });

  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const slots = await prisma.consultantSlot.findMany({
    where: {
      consultantId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      isBooked: false,
    },
    orderBy: [{ startTime: "asc" }],
  });

  return c.json({ slots });
});

consultancyRoutes.get("/my-bookings", async (c) => {
  const userId = c.get("user").sub;

  const bookings = await prisma.consultancyBooking.findMany({
    where: { userId },
    include: {
      consultant: { include: { category: true } },
      slot: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return c.json({ bookings });
});

consultancyRoutes.post("/create-order", async (c) => {
  const userId = c.get("user").sub;
  const body = await c.req.json<{
    consultantId: string;
    slotId: string;
    consultationType: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    notes?: string;
  }>();

  const { consultantId, slotId, consultationType, userName, userEmail, userPhone, notes } = body;

  if (!consultantId || !slotId || !consultationType) {
    throw new HTTPException(400, { message: "Consultant, slot and consultation type are required" });
  }

  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    include: { category: true, slots: true },
  });

  if (!consultant || !consultant.available) {
    throw new HTTPException(404, { message: "Consultant not available" });
  }

  const validType = consultant.consultationTypes.includes(consultationType);
  if (!validType) {
    throw new HTTPException(400, { message: "Selected consultation type is not available" });
  }

  const slot = await prisma.consultantSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.consultantId !== consultantId) {
    throw new HTTPException(404, { message: "Consultation slot not found" });
  }
  if (slot.isBooked) {
    throw new HTTPException(409, { message: "This slot is no longer available" });
  }

  const existingBooking = await prisma.consultancyBooking.findFirst({
    where: {
      userId,
      slotId,
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
    },
  });

  if (existingBooking) {
    throw new HTTPException(409, { message: "You already booked this time slot" });
  }

  if (!isRazorpayConfigured()) {
    throw new HTTPException(503, { message: "Payment gateway not configured" });
  }

  const booking = await prisma.consultancyBooking.create({
    data: {
      userId,
      consultantId,
      slotId,
      categoryId: consultant.categoryId,
      consultationType,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      amount: consultant.hourlyRate,
      currency: consultant.currency,
      status: "PENDING",
      provider: "RAZORPAY",
      userName: userName || undefined,
      userEmail: userEmail || undefined,
      userPhone: userPhone || undefined,
      notes: notes || undefined,
    },
  });

  const order = await createRazorpayOrder({
    amount: consultant.hourlyRate,
    currency: consultant.currency,
    receipt: booking.id,
    notes: {
      userId,
      consultantId,
      slotId,
      title: `${consultant.name} consultation`,
      consultationType,
    },
  });

  await prisma.consultancyBooking.update({
    where: { id: booking.id },
    data: { providerOrderId: order.id },
  });

  return c.json({
    bookingId: booking.id,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: getRazorpayKeyId(),
  });
});

consultancyRoutes.post("/verify", async (c) => {
  const userId = c.get("user").sub;
  const body = await c.req.json<{
    bookingId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }>();

  const booking = await prisma.consultancyBooking.findFirst({
    where: { id: body.bookingId, userId },
    include: { slot: true },
  });

  if (!booking) throw new HTTPException(404, { message: "Booking not found" });
  if (booking.status === "CONFIRMED" || booking.status === "COMPLETED") {
    return c.json({ success: true, alreadyConfirmed: true });
  }

  const valid = verifyRazorpaySignature(
    body.razorpay_order_id,
    body.razorpay_payment_id,
    body.razorpay_signature
  );

  if (!valid) {
    await prisma.consultancyBooking.update({
      where: { id: booking.id },
      data: { status: "FAILED" },
    });
    throw new HTTPException(400, { message: "Payment verification failed" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.consultancyBooking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        providerPaymentId: body.razorpay_payment_id,
      },
    });

    await tx.consultantSlot.update({
      where: { id: booking.slotId },
      data: { isBooked: true },
    });
  });

  return c.json({ success: true });
});
