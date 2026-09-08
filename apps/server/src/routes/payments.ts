import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { getExpiryDate, checkPrerequisitesMet } from "../lib/courses.js";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayKeyId,
  isRazorpayConfigured,
} from "../lib/razorpay.js";
import { resolveKitImageUrl } from "../lib/kits.js";
import { notifyKitOrderCreated } from "../lib/email.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const paymentsRoutes = new Hono<{ Variables: AuthVariables }>();

paymentsRoutes.use("*", requireAuth);

const kitOrderInclude = {
  kit: { select: { id: true, title: true, imageStorageKey: true } },
  kitOrderEvents: { orderBy: { createdAt: "asc" as const } },
} as const;

type KitOrderPayload = Prisma.PaymentGetPayload<{ include: typeof kitOrderInclude }>;

function serializeKitOrder(order: KitOrderPayload, apiBaseUrl: string) {
  const fulfillmentStatus = order.fulfillmentStatus || "PROCESSING";
  const events = order.kitOrderEvents.length > 0
    ? order.kitOrderEvents
    : [{
        id: `${order.id}-processing`,
        status: fulfillmentStatus,
        note: "Order received and being prepared.",
        location: null,
        createdAt: order.createdAt,
      }];

  return {
    id: order.id,
    createdAt: order.createdAt.toISOString(),
    completedAt: order.completedAt?.toISOString() || null,
    amount: order.amount,
    currency: order.currency,
    quantity: order.quantity,
    itemTitle: order.itemTitle || order.kit?.title || "Research kit",
    imageUrl: order.kit
      ? resolveKitImageUrl(order.kit.imageStorageKey, apiBaseUrl)
      : null,
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
    events: events.map((event) => ({
      id: event.id,
      status: event.status,
      note: event.note,
      location: event.location,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

paymentsRoutes.get("/kits", async (c) => {
  const orders = await prisma.payment.findMany({
    where: { userId: c.get("user").sub, kitId: { not: null } },
    orderBy: { createdAt: "desc" },
    include: kitOrderInclude,
  });
  const apiBaseUrl = (() => {
    const url = new URL(c.req.url);
    return `${url.protocol}//${url.host}`;
  })();
  return c.json({ orders: orders.map((order) => serializeKitOrder(order, apiBaseUrl)) });
});

paymentsRoutes.get("/kits/:id", async (c) => {
  const order = await prisma.payment.findFirst({
    where: { id: c.req.param("id"), userId: c.get("user").sub, kitId: { not: null } },
    include: kitOrderInclude,
  });
  if (!order) throw new HTTPException(404, { message: "Order not found" });
  const url = new URL(c.req.url);
  return c.json({ order: serializeKitOrder(order, `${url.protocol}//${url.host}`) });
});

paymentsRoutes.post("/create-order", async (c) => {
  const userId = c.get("user").sub;
  const {
    courseId,
    packageId,
    kitId,
    quantity,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
  } = await c.req.json<{
    courseId?: string;
    packageId?: string;
    kitId?: string;
    quantity?: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingAddress?: string;
  }>();

  const targetCount = [courseId, packageId, kitId].filter(Boolean).length;
  if (targetCount === 0) {
    throw new HTTPException(400, { message: "courseId, packageId, or kitId required" });
  }
  if (targetCount > 1) {
    throw new HTTPException(400, { message: "Provide only one purchase target" });
  }

  let amount = 0;
  let currency = "INR";
  let title = "";
  let kitQuantity = 1;

  if (courseId) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, published: true },
      include: { prerequisites: true },
    });
    if (!course) throw new HTTPException(404, { message: "Course not found" });

    const prereqIds = course.prerequisites.map((p) => p.prerequisiteCourseId);
    const met = await checkPrerequisitesMet(userId, prereqIds, prisma);
    if (!met) {
      throw new HTTPException(403, { message: "Prerequisite courses must be completed first" });
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing && existing.status !== "EXPIRED") {
      throw new HTTPException(400, { message: "Already enrolled in this course" });
    }

    amount = course.price;
    currency = course.currency;
    title = course.title;
  } else if (packageId) {
    const pkg = await prisma.coursePackage.findFirst({
      where: { id: packageId!, published: true },
      include: { items: true },
    });
    if (!pkg) throw new HTTPException(404, { message: "Package not found" });
    amount = pkg.price;
    currency = pkg.currency;
    title = pkg.title;
  } else {
    const kit = await prisma.researchKit.findFirst({
      where: { id: kitId!, published: true },
    });
    if (!kit) throw new HTTPException(404, { message: "Kit not found" });
    if (kit.stock <= 0) throw new HTTPException(409, { message: "Kit is out of stock" });
    kitQuantity = quantity ?? 1;
    if (!Number.isInteger(kitQuantity) || kitQuantity < 1) {
      throw new HTTPException(400, { message: "Quantity must be a positive integer" });
    }
    if (kitQuantity > kit.stock) {
      throw new HTTPException(409, { message: "Requested quantity exceeds available stock" });
    }

    const normalizedCustomerName = customerName?.trim();
    const normalizedCustomerEmail = customerEmail?.trim().toLowerCase();
    const normalizedCustomerPhone = customerPhone?.trim();
    const normalizedShippingAddress = shippingAddress?.trim();
    if (
      !normalizedCustomerName ||
      !normalizedCustomerEmail ||
      !normalizedCustomerPhone ||
      !normalizedShippingAddress
    ) {
      throw new HTTPException(400, { message: "Customer and shipping details are required" });
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedCustomerEmail)) {
      throw new HTTPException(400, { message: "A valid email address is required" });
    }
    if (!/^[+()\d\s-]{7,20}$/.test(normalizedCustomerPhone)) {
      throw new HTTPException(400, { message: "A valid phone number is required" });
    }
    if (normalizedShippingAddress.length < 10) {
      throw new HTTPException(400, { message: "A complete shipping address is required" });
    }

    amount = kit.price * kitQuantity;
    title = kit.title;
  }

  if (amount <= 0) {
    const payment = await prisma.$transaction(async (transaction) => {
      const createdPayment = await transaction.payment.create({
        data: {
          userId,
          courseId: courseId || null,
          packageId: packageId || null,
          kitId: kitId || null,
          quantity: kitQuantity,
          customerName: customerName?.trim() || null,
          customerEmail: customerEmail?.trim().toLowerCase() || null,
          customerPhone: customerPhone?.trim() || null,
          shippingAddress: shippingAddress?.trim() || null,
          itemTitle: kitId ? title : null,
          unitAmount: kitId ? amount : null,
          fulfillmentStatus: kitId ? "PROCESSING" : null,
          amount: 0,
          currency,
          provider: "MANUAL",
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      if (kitId) {
        const stockUpdate = await transaction.researchKit.updateMany({
          where: { id: kitId, stock: { gte: kitQuantity } },
          data: { stock: { decrement: kitQuantity } },
        });
        if (stockUpdate.count !== 1) {
          throw new HTTPException(409, { message: "Kit is out of stock" });
        }
        await transaction.kitOrderEvent.create({
          data: { paymentId: createdPayment.id, status: "PROCESSING" },
        });
      }

      return createdPayment;
    });

    if (!kitId) {
      await createEnrollments(userId, courseId, packageId, payment.id);
    } else {
      notifyKitOrderCreated(payment.id).catch((err) =>
        console.error("[payments] Failed to notify kit order creation:", err)
      );
    }
    return c.json({ free: true, paymentId: payment.id });
  }

  if (!isRazorpayConfigured()) {
    throw new HTTPException(503, { message: "Payment gateway not configured" });
  }

  const payment = await prisma.payment.create({
    data: {
      userId,
      courseId: courseId || null,
      packageId: packageId || null,
      kitId: kitId || null,
      quantity: kitQuantity,
      customerName: customerName?.trim() || null,
      customerEmail: customerEmail?.trim().toLowerCase() || null,
      customerPhone: customerPhone?.trim() || null,
      shippingAddress: shippingAddress?.trim() || null,
      itemTitle: kitId ? title : null,
      unitAmount: kitId ? kitQuantity > 0 ? amount / kitQuantity : amount : null,
      fulfillmentStatus: kitId ? "PROCESSING" : null,
      amount,
      currency,
      provider: "RAZORPAY",
      status: "PENDING",
    },
  });

  const order = await createRazorpayOrder({
    amount,
    currency,
    receipt: payment.id,
    notes: {
      userId,
      courseId: courseId || "",
      packageId: packageId || "",
      kitId: kitId || "",
      title,
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerOrderId: order.id },
  });

  return c.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: getRazorpayKeyId(),
    paymentId: payment.id,
  });
});

paymentsRoutes.post("/verify", async (c) => {
  const userId = c.get("user").sub;
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    paymentId,
  } = await c.req.json<{
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    paymentId: string;
  }>();

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
  });

  if (!payment) throw new HTTPException(404, { message: "Payment not found" });
  if (payment.status === "COMPLETED") {
    return c.json({ success: true, alreadyCompleted: true });
  }

  const valid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!valid) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    throw new HTTPException(400, { message: "Payment verification failed" });
  }

  await prisma.$transaction(async (transaction) => {
    const currentPayment = await transaction.payment.findUnique({
      where: { id: payment.id },
    });
    if (!currentPayment || currentPayment.status === "COMPLETED") return;

    if (currentPayment.kitId) {
      const stockUpdate = await transaction.researchKit.updateMany({
        where: { id: currentPayment.kitId, stock: { gte: currentPayment.quantity } },
        data: { stock: { decrement: currentPayment.quantity } },
      });
      if (stockUpdate.count !== 1) {
        throw new HTTPException(409, { message: "Kit is out of stock" });
      }
    }

    await transaction.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        providerPaymentId: razorpay_payment_id,
        completedAt: new Date(),
      },
    });

    if (currentPayment.kitId) {
      await transaction.kitOrderEvent.create({
        data: {
          paymentId: currentPayment.id,
          status: currentPayment.fulfillmentStatus || "PROCESSING",
        },
      });
    }
  });

  if (!payment.kitId) {
    await createEnrollments(userId, payment.courseId, payment.packageId, payment.id);
  } else {
    notifyKitOrderCreated(payment.id).catch((err) =>
      console.error("[payments] Failed to notify kit order creation:", err)
    );
  }

  return c.json({ success: true });
});

async function createEnrollments(
  userId: string,
  courseId: string | null | undefined,
  packageId: string | null | undefined,
  paymentId: string
) {
  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return;

    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: {
        userId,
        courseId,
        status: "ACTIVE",
        expiresAt: getExpiryDate(course.accessDurationDays),
        paymentId,
      },
      update: {
        status: "ACTIVE",
        expiresAt: getExpiryDate(course.accessDurationDays),
        paymentId,
        purchasedAt: new Date(),
      },
    });
    return;
  }

  if (packageId) {
    const pkg = await prisma.coursePackage.findUnique({
      where: { id: packageId },
      include: { items: true },
    });
    if (!pkg) return;

    for (const item of pkg.items) {
      const course = await prisma.course.findUnique({ where: { id: item.courseId } });
      if (!course) continue;

      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId: item.courseId } },
        create: {
          userId,
          courseId: item.courseId,
          packageId,
          status: "ACTIVE",
          expiresAt: getExpiryDate(pkg.accessDurationDays),
          paymentId,
        },
        update: {
          status: "ACTIVE",
          expiresAt: getExpiryDate(pkg.accessDurationDays),
          packageId,
          paymentId,
          purchasedAt: new Date(),
        },
      });
    }
  }
}
