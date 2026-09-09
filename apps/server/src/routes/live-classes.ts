import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { prisma } from "../lib/prisma.js";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyRazorpaySignature,
} from "../lib/razorpay.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const liveClassesRoutes = new Hono<{ Variables: AuthVariables }>();
liveClassesRoutes.use("*", requireAuth);

const classSelect = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  courseId: true,
  roomName: true,
  scheduledAt: true,
  startTime: true,
  duration: true,
  maxParticipants: true,
  price: true,
  originalPrice: true,
  currency: true,
  isPaid: true,
  studentCameraEnabled: true,
  studentMicrophoneEnabled: true,
  chatEnabled: true,
  recordingEnabled: true,
  status: true,
  teacher: { select: { id: true, name: true, email: true, avatarUrl: true } },
  course: { select: { id: true, title: true } },
  _count: { select: { enrollments: true, attendance: true } },
} as const;

async function currentUser(c: Context<{ Variables: AuthVariables }>) {
  const authUser = c.get("user");
  const user = await prisma.user.findUnique({ where: { id: authUser.sub } });
  if (!user) throw new HTTPException(401, { message: "User not found" });
  return user;
}

function requireLiveKit() {
  const url = process.env.LIVEKIT_URL?.trim();
  const key = process.env.LIVEKIT_API_KEY?.trim();
  const secret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !key || !secret) {
    throw new HTTPException(503, { message: "Live class streaming is not configured" });
  }
  return { url, key, secret };
}

liveClassesRoutes.get("/", async (c) => {
  const classes = await prisma.liveClass.findMany({
    orderBy: { scheduledAt: "asc" },
    select: classSelect,
  });
  const userId = c.get("user").sub;
  const enrollments = await prisma.liveClassEnrollment.findMany({
    where: { userId, status: "ACTIVE" },
    select: { liveClassId: true },
  });
  const enrolled = new Set(enrollments.map((item) => item.liveClassId));
  return c.json({ classes: classes.map((item) => ({ ...item, isEnrolled: enrolled.has(item.id) })) });
});

liveClassesRoutes.get("/:id", async (c) => {
  const item = await prisma.liveClass.findUnique({ where: { id: c.req.param("id") }, select: classSelect });
  if (!item) throw new HTTPException(404, { message: "Live class not found" });
  const enrollment = await prisma.liveClassEnrollment.findUnique({
    where: { userId_liveClassId: { userId: c.get("user").sub, liveClassId: item.id } },
  });
  return c.json({ class: { ...item, isEnrolled: enrollment?.status === "ACTIVE" } });
});

liveClassesRoutes.post("/", requireAdmin, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const title = String(body.title ?? "").trim();
  const teacherId = String(body.teacherId ?? c.get("user").sub);
  const scheduledAt = new Date(String(body.scheduledAt ?? ""));
  if (!title || Number.isNaN(scheduledAt.getTime())) {
    throw new HTTPException(400, { message: "Title and a valid scheduledAt are required" });
  }
  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher) throw new HTTPException(400, { message: "Teacher not found" });
  const price = Math.max(0, Math.round(Number(body.price) || 0));
  const originalPrice = body.originalPrice === undefined || String(body.originalPrice).trim() === "" ? null : Math.max(0, Math.round(Number(body.originalPrice) || 0));
  if (originalPrice !== null && originalPrice < price) throw new HTTPException(400, { message: "Original price must be at least the payable price" });
  const liveClass = await prisma.liveClass.create({
    data: {
      title,
      description: String(body.description ?? "").trim() || null,
      thumbnail: String(body.thumbnail ?? "").trim() || null,
      courseId: String(body.courseId ?? "").trim() || null,
      teacherId,
      roomName: `live-class-${randomUUID()}`,
      scheduledAt,
      startTime: String(body.startTime ?? ""),
      duration: Number(body.duration ?? 60),
      maxParticipants: Math.max(1, Math.round(Number(body.maxParticipants) || 100)),
      price,
      originalPrice: originalPrice === price ? null : originalPrice,
      currency: String(body.currency ?? "INR"),
      isPaid: price > 0,
      studentCameraEnabled: body.studentCameraEnabled !== false,
      studentMicrophoneEnabled: body.studentMicrophoneEnabled !== false,
      chatEnabled: body.chatEnabled !== false,
      recordingEnabled: body.recordingEnabled === true,
    },
    select: classSelect,
  });
  return c.json({ class: liveClass }, 201);
});

liveClassesRoutes.patch("/:id", requireAdmin, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const existing = await prisma.liveClass.findUnique({ where: { id: c.req.param("id") } });
  if (!existing) throw new HTTPException(404, { message: "Live class not found" });
  const price = body.price === undefined ? existing.price : Math.max(0, Math.round(Number(body.price) || 0));
  const originalPrice = body.originalPrice === undefined && body.price === undefined ? existing.originalPrice : (String(body.originalPrice ?? "").trim() === "" ? null : Math.max(0, Math.round(Number(body.originalPrice) || 0)));
  if (originalPrice !== null && originalPrice < price) throw new HTTPException(400, { message: "Original price must be at least the payable price" });
  const updated = await prisma.liveClass.update({
    where: { id: existing.id },
    data: {
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.description !== undefined ? { description: String(body.description).trim() || null } : {}),
      ...(body.thumbnail !== undefined ? { thumbnail: String(body.thumbnail).trim() || null } : {}),
      ...(body.scheduledAt !== undefined ? { scheduledAt: new Date(String(body.scheduledAt)) } : {}),
      ...(body.startTime !== undefined ? { startTime: String(body.startTime) } : {}),
      ...(body.duration !== undefined ? { duration: Number(body.duration) } : {}),
      ...(body.maxParticipants !== undefined ? { maxParticipants: Math.max(1, Number(body.maxParticipants)) } : {}),
      ...(body.price !== undefined ? { price, isPaid: price > 0 } : {}),
      ...(body.originalPrice !== undefined || body.price !== undefined ? { originalPrice: originalPrice === price ? null : originalPrice } : {}),
      ...(body.status !== undefined ? { status: String(body.status) as "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED" } : {}),
      ...(body.studentCameraEnabled !== undefined ? { studentCameraEnabled: Boolean(body.studentCameraEnabled) } : {}),
      ...(body.studentMicrophoneEnabled !== undefined ? { studentMicrophoneEnabled: Boolean(body.studentMicrophoneEnabled) } : {}),
      ...(body.chatEnabled !== undefined ? { chatEnabled: Boolean(body.chatEnabled) } : {}),
      ...(body.recordingEnabled !== undefined ? { recordingEnabled: Boolean(body.recordingEnabled) } : {}),
    },
    select: classSelect,
  });
  return c.json({ class: updated });
});

liveClassesRoutes.delete("/:id", requireAdmin, async (c) => {
  await prisma.liveClass.delete({ where: { id: c.req.param("id") } });
  return c.json({ success: true });
});

liveClassesRoutes.post("/:id/start", requireAdmin, async (c) => {
  const liveClass = await prisma.liveClass.update({ where: { id: c.req.param("id") }, data: { status: "LIVE" }, select: classSelect });
  return c.json({ class: liveClass });
});

liveClassesRoutes.post("/:id/end", requireAdmin, async (c) => {
  const liveClass = await prisma.liveClass.update({ where: { id: c.req.param("id") }, data: { status: "COMPLETED" }, select: classSelect });
  try {
    await createLiveKitRoomService().deleteRoom(liveClass.roomName);
  } catch {
    // The class state remains completed if LiveKit is unavailable during cleanup.
  }
  return c.json({ class: liveClass });
});

liveClassesRoutes.post("/:id/token", async (c) => {
  const user = await currentUser(c);
  const liveClass = await prisma.liveClass.findUnique({ where: { id: c.req.param("id") } });
  if (!liveClass) throw new HTTPException(404, { message: "Live class not found" });
  if (!["SCHEDULED", "LIVE"].includes(liveClass.status)) throw new HTTPException(409, { message: "This class is not available" });
  const admin = user.role === "ADMIN";
  const teacher = liveClass.teacherId === user.id;
  const enrollment = await prisma.liveClassEnrollment.findUnique({ where: { userId_liveClassId: { userId: user.id, liveClassId: liveClass.id } } });
  if (!admin && !teacher && liveClass.isPaid && enrollment?.status !== "ACTIVE") throw new HTTPException(403, { message: "Purchase access to join this class" });
  const activeParticipants = await prisma.liveClassAttendance.count({ where: { liveClassId: liveClass.id, leftAt: null } });
  if (!admin && !teacher && activeParticipants >= liveClass.maxParticipants) throw new HTTPException(409, { message: "This class is full" });
  const config = requireLiveKit();
  const token = new AccessToken(config.key, config.secret, { identity: user.id, name: user.name || user.email, ttl: "2h" });
  const canPublishCamera = teacher || admin || liveClass.studentCameraEnabled;
  const canPublishMicrophone = teacher || admin || liveClass.studentMicrophoneEnabled;
  token.addGrant({ roomJoin: true, room: liveClass.roomName, canPublish: canPublishCamera || canPublishMicrophone, canPublishSources: [
    ...(canPublishCamera ? [TrackSource.CAMERA] : []),
    ...(canPublishMicrophone ? [TrackSource.MICROPHONE] : []),
  ], canSubscribe: true, canPublishData: liveClass.chatEnabled });
  const attendance = await prisma.liveClassAttendance.create({ data: { userId: user.id, liveClassId: liveClass.id } });
  return c.json({ token: await token.toJwt(), url: config.url, attendanceId: attendance.id, permissions: { camera: teacher || admin || liveClass.studentCameraEnabled, microphone: teacher || admin || liveClass.studentMicrophoneEnabled, chat: liveClass.chatEnabled } });
});

liveClassesRoutes.post("/:id/leave", async (c) => {
  const userId = c.get("user").sub;
  const attendanceId = String((await c.req.json<{ attendanceId?: string }>()).attendanceId ?? "");
  const attendance = await prisma.liveClassAttendance.findFirst({ where: { id: attendanceId, userId, liveClassId: c.req.param("id"), leftAt: null } });
  if (!attendance) throw new HTTPException(404, { message: "Active attendance not found" });
  const leftAt = new Date();
  await prisma.liveClassAttendance.update({ where: { id: attendance.id }, data: { leftAt, duration: Math.max(0, Math.floor((leftAt.getTime() - attendance.joinedAt.getTime()) / 1000)), status: "LEFT" } });
  return c.json({ success: true });
});

liveClassesRoutes.post("/:id/payment/order", async (c) => {
  const userId = c.get("user").sub;
  const liveClass = await prisma.liveClass.findUnique({ where: { id: c.req.param("id") } });
  if (!liveClass) throw new HTTPException(404, { message: "Live class not found" });
  if (!liveClass.isPaid || liveClass.price <= 0) {
    await prisma.liveClassEnrollment.upsert({ where: { userId_liveClassId: { userId, liveClassId: liveClass.id } }, create: { userId, liveClassId: liveClass.id }, update: { status: "ACTIVE" } });
    return c.json({ free: true });
  }
  if (!isRazorpayConfigured()) throw new HTTPException(503, { message: "Payment gateway not configured" });
  const payment = await prisma.payment.create({ data: { userId, liveClassId: liveClass.id, amount: liveClass.price, currency: liveClass.currency, provider: "RAZORPAY", status: "PENDING" } });
  const order = await createRazorpayOrder({ amount: liveClass.price, currency: liveClass.currency, receipt: payment.id, notes: { userId, liveClassId: liveClass.id, title: liveClass.title } });
  await prisma.payment.update({ where: { id: payment.id }, data: { providerOrderId: order.id } });
  return c.json({ paymentId: payment.id, orderId: order.id, amount: order.amount, currency: order.currency, keyId: getRazorpayKeyId() });
});

liveClassesRoutes.post("/:id/payment/verify", async (c) => {
  const userId = c.get("user").sub;
  const body = await c.req.json<{ paymentId: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>();
  const payment = await prisma.payment.findFirst({ where: { id: body.paymentId, userId, liveClassId: c.req.param("id") } });
  if (!payment) throw new HTTPException(404, { message: "Payment not found" });
  if (payment.status === "COMPLETED") return c.json({ success: true, alreadyCompleted: true });
  if (!verifyRazorpaySignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) throw new HTTPException(400, { message: "Payment verification failed" });
  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: "COMPLETED", providerPaymentId: body.razorpay_payment_id, completedAt: new Date() } }),
    prisma.liveClassEnrollment.upsert({ where: { userId_liveClassId: { userId, liveClassId: c.req.param("id") } }, create: { userId, liveClassId: c.req.param("id"), paymentId: payment.id }, update: { status: "ACTIVE", paymentId: payment.id } }),
  ]);
  return c.json({ success: true });
});

liveClassesRoutes.get("/:id/attendance", requireAdmin, async (c) => {
  const attendance = await prisma.liveClassAttendance.findMany({ where: { liveClassId: c.req.param("id") }, orderBy: { joinedAt: "asc" }, include: { user: { select: { id: true, name: true, email: true } } } });
  return c.json({ attendance });
});

liveClassesRoutes.get("/:id/participants", requireAdmin, async (c) => {
  const liveClass = await prisma.liveClass.findUnique({ where: { id: c.req.param("id") } });
  if (!liveClass) throw new HTTPException(404, { message: "Live class not found" });
  try {
    const participants = await createLiveKitRoomService().listParticipants(liveClass.roomName);
    return c.json({ participants });
  } catch {
    return c.json({ participants: [] });
  }
});

export const liveClassWebhookRoutes = new Hono();
liveClassWebhookRoutes.post("/razorpay", async (c) => {
  const signature = c.req.header("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const raw = await c.req.text();
  if (!signature || !secret) throw new HTTPException(400, { message: "Invalid webhook" });
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new HTTPException(400, { message: "Invalid webhook signature" });
  const payload = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } } };
  const eventId = c.req.header("x-razorpay-event-id") || `${payload.event}:${payload.payload?.payment?.entity?.id || randomUUID()}`;
  const existing = await prisma.liveClassWebhookEvent.findUnique({ where: { id: eventId } });
  if (existing) return c.json({ received: true, duplicate: true });
  await prisma.liveClassWebhookEvent.create({ data: { id: eventId, event: payload.event || "unknown" } });
  const paymentId = payload.payload?.payment?.entity?.id;
  const orderId = payload.payload?.payment?.entity?.order_id;
  if (paymentId && orderId && payload.event === "payment.captured") {
    await prisma.payment.updateMany({ where: { providerOrderId: orderId, providerPaymentId: null }, data: { providerPaymentId: paymentId, status: "COMPLETED", completedAt: new Date() } });
  }
  if (paymentId && orderId && payload.event === "payment.failed") {
    await prisma.payment.updateMany({ where: { providerOrderId: orderId, providerPaymentId: null }, data: { providerPaymentId: paymentId, status: "FAILED" } });
  }
  if (paymentId && orderId && payload.event === "refund.processed") {
    const payments = await prisma.payment.findMany({ where: { providerOrderId: orderId, providerPaymentId: paymentId, liveClassId: { not: null } }, select: { id: true, userId: true, liveClassId: true } });
    await prisma.payment.updateMany({ where: { id: { in: payments.map((payment) => payment.id) } }, data: { status: "REFUNDED" } });
    for (const payment of payments) {
      if (payment.liveClassId) await prisma.liveClassEnrollment.updateMany({ where: { userId: payment.userId, liveClassId: payment.liveClassId }, data: { status: "CANCELLED" } });
    }
  }
  return c.json({ received: true });
});

export function createLiveKitRoomService() {
  const config = requireLiveKit();
  return new RoomServiceClient(config.url, config.key, config.secret);
}