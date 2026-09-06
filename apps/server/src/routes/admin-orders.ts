import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { KitFulfillmentStatus, Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { resolveKitImageUrl } from "../lib/kits.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const adminOrdersRoutes = new Hono<{ Variables: AuthVariables }>();
adminOrdersRoutes.use("*", requireAuth, requireAdmin);

const statuses = [
  "PROCESSING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;

const orderInclude = {
  user: { select: { id: true, name: true, email: true } },
  kit: { select: { id: true, title: true, imageStorageKey: true } },
  kitOrderEvents: {
    orderBy: { createdAt: "asc" as const },
    include: { actor: { select: { name: true, email: true } } },
  },
} as const;

type AdminOrderPayload = Prisma.PaymentGetPayload<{ include: typeof orderInclude }>;

function serializeOrder(order: AdminOrderPayload, apiBaseUrl: string) {
  const fulfillmentStatus = order.fulfillmentStatus || "PROCESSING";
  const events = order.kitOrderEvents.length > 0
    ? order.kitOrderEvents
    : [{
        id: `${order.id}-processing`,
        status: fulfillmentStatus,
        note: "Order received and being prepared.",
        location: null,
        createdAt: order.createdAt,
        actor: null,
      }];

  return {
    id: order.id,
    createdAt: order.createdAt.toISOString(),
    completedAt: order.completedAt?.toISOString() || null,
    amount: order.amount,
    currency: order.currency,
    quantity: order.quantity,
    itemTitle: order.itemTitle || order.kit?.title || "Research kit",
    imageUrl: order.kit ? resolveKitImageUrl(order.kit.imageStorageKey, apiBaseUrl) : null,
    paymentStatus: order.status,
    fulfillmentStatus,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    estimatedDeliveryAt: order.estimatedDeliveryAt?.toISOString() || null,
    shippedAt: order.shippedAt?.toISOString() || null,
    deliveredAt: order.deliveredAt?.toISOString() || null,
    user: order.user,
    events: events.map((event) => ({
      id: event.id,
      status: event.status,
      note: event.note,
      location: event.location,
      createdAt: event.createdAt.toISOString(),
      actor: event.actor,
    })),
  };
}

function apiBaseUrl(c: { req: { url: string } }) {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

adminOrdersRoutes.get("/orders", async (c) => {
  const requestedStatus = c.req.query("status");
  const search = c.req.query("search")?.trim();
  const page = Math.max(1, Number.parseInt(c.req.query("page") || "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(c.req.query("pageSize") || "20", 10) || 20));
  const where = {
    kitId: { not: null },
    ...(statuses.includes(requestedStatus as (typeof statuses)[number])
      ? { fulfillmentStatus: requestedStatus as KitFulfillmentStatus }
      : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" as const } },
            { itemTitle: { contains: search, mode: "insensitive" as const } },
            { customerName: { contains: search, mode: "insensitive" as const } },
            { customerEmail: { contains: search, mode: "insensitive" as const } },
            { trackingNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, orders] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: orderInclude,
    }),
  ]);
  return c.json({
    orders: orders.map((order) => serializeOrder(order, apiBaseUrl(c))),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

adminOrdersRoutes.get("/orders/:id", async (c) => {
  const order = await prisma.payment.findFirst({
    where: { id: c.req.param("id"), kitId: { not: null } },
    include: orderInclude,
  });
  if (!order) throw new HTTPException(404, { message: "Order not found" });
  return c.json({ order: serializeOrder(order, apiBaseUrl(c)) });
});

adminOrdersRoutes.patch("/orders/:id", async (c) => {
  const body = await c.req.json<{
    status?: string;
    carrier?: string | null;
    trackingNumber?: string | null;
    estimatedDeliveryAt?: string | null;
    note?: string | null;
    location?: string | null;
  }>();
  const order = await prisma.payment.findFirst({
    where: { id: c.req.param("id"), kitId: { not: null } },
  });
  if (!order) throw new HTTPException(404, { message: "Order not found" });
  if (order.status !== "COMPLETED") {
    throw new HTTPException(409, { message: "Only completed payments can be fulfilled" });
  }

  const nextStatus = body.status || order.fulfillmentStatus || "PROCESSING";
  if (!statuses.includes(nextStatus as (typeof statuses)[number])) {
    throw new HTTPException(400, { message: "Invalid fulfillment status" });
  }
  const estimatedDeliveryAt = body.estimatedDeliveryAt === undefined
    ? undefined
    : body.estimatedDeliveryAt
      ? new Date(body.estimatedDeliveryAt)
      : null;
  if (estimatedDeliveryAt instanceof Date && Number.isNaN(estimatedDeliveryAt.getTime())) {
    throw new HTTPException(400, { message: "Invalid estimated delivery date" });
  }
  const now = new Date();
  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transaction.payment.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: nextStatus as KitFulfillmentStatus,
        ...(body.carrier !== undefined ? { carrier: body.carrier?.trim() || null } : {}),
        ...(body.trackingNumber !== undefined ? { trackingNumber: body.trackingNumber?.trim() || null } : {}),
        ...(body.estimatedDeliveryAt !== undefined ? { estimatedDeliveryAt } : {}),
        ...(nextStatus === "SHIPPED" && !order.shippedAt ? { shippedAt: now } : {}),
        ...(nextStatus === "DELIVERED" && !order.deliveredAt ? { deliveredAt: now } : {}),
      },
      include: orderInclude,
    });
    await transaction.kitOrderEvent.create({
      data: {
        paymentId: order.id,
        status: nextStatus as KitFulfillmentStatus,
        note: body.note?.trim() || null,
        location: body.location?.trim() || null,
        actorId: c.get("user").sub,
      },
    });
    return result;
  });
  return c.json({ order: serializeOrder(updated, apiBaseUrl(c)) });
});
