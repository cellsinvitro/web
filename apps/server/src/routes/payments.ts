import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { getExpiryDate, checkPrerequisitesMet } from "../lib/courses.js";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayKeyId,
  isRazorpayConfigured,
} from "../lib/razorpay.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const paymentsRoutes = new Hono<{ Variables: AuthVariables }>();

paymentsRoutes.use("*", requireAuth);

paymentsRoutes.post("/create-order", async (c) => {
  const userId = c.get("user").sub;
  const { courseId, packageId } = await c.req.json<{
    courseId?: string;
    packageId?: string;
  }>();

  if (!courseId && !packageId) {
    throw new HTTPException(400, { message: "courseId or packageId required" });
  }
  if (courseId && packageId) {
    throw new HTTPException(400, { message: "Provide only courseId or packageId" });
  }

  let amount = 0;
  let currency = "INR";
  let title = "";

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
  } else {
    const pkg = await prisma.coursePackage.findFirst({
      where: { id: packageId!, published: true },
      include: { items: true },
    });
    if (!pkg) throw new HTTPException(404, { message: "Package not found" });
    amount = pkg.price;
    currency = pkg.currency;
    title = pkg.title;
  }

  if (amount <= 0) {
    // Free enrollment
    const payment = await prisma.payment.create({
      data: {
        userId,
        courseId: courseId || null,
        packageId: packageId || null,
        amount: 0,
        currency,
        provider: "MANUAL",
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    await createEnrollments(userId, courseId, packageId, payment.id);
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

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "COMPLETED",
      providerPaymentId: razorpay_payment_id,
      completedAt: new Date(),
    },
  });

  await createEnrollments(
    userId,
    payment.courseId,
    payment.packageId,
    payment.id
  );

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
