import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayKeyId,
  isRazorpayConfigured,
} from "../lib/razorpay.js";
import { notifyLmsPaymentCompleted } from "../lib/email.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const lmsRoutes = new Hono<{ Variables: AuthVariables }>();

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

// ─── Public / Auth User Endpoints ──────────────────────────────────────────

// GET /api/lms/settings - Fetch current LMS pricing & bundle discounts
lmsRoutes.get("/settings", async (c) => {
  const settings = await getOrCreateLmsSettings();
  return c.json({
    settings: {
      repoPrice: settings.repoPrice,
      stockPrice: settings.stockPrice,
      budgetPrice: settings.budgetPrice,
      logbookPrice: settings.logbookPrice,
      twoSectionDiscountPct: settings.twoSectionDiscountPct,
      threeSectionDiscountPct: settings.threeSectionDiscountPct,
      fullAccessPrice: settings.fullAccessPrice,
      currency: settings.currency,
      razorpayKeyId: getRazorpayKeyId(),
      isRazorpayConfigured: isRazorpayConfigured(),
    },
  });
});

// PUT /api/lms/settings - Admin endpoint to update LMS module prices & discounts
lmsRoutes.put("/settings", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    throw new HTTPException(403, { message: "Admin privileges required to update LMS pricing" });
  }

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

  if (!body) {
    throw new HTTPException(400, { message: "Invalid request payload" });
  }

  const updated = await prisma.lmsSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      repoPrice: body.repoPrice ?? 149900,
      stockPrice: body.stockPrice ?? 149900,
      budgetPrice: body.budgetPrice ?? 149900,
      logbookPrice: body.logbookPrice ?? 199900,
      twoSectionDiscountPct: body.twoSectionDiscountPct ?? 15,
      threeSectionDiscountPct: body.threeSectionDiscountPct ?? 25,
      fullAccessPrice: body.fullAccessPrice ?? 399900,
      currency: body.currency ?? "INR",
    },
    update: {
      ...(body.repoPrice !== undefined && { repoPrice: Math.max(0, Math.round(body.repoPrice)) }),
      ...(body.stockPrice !== undefined && { stockPrice: Math.max(0, Math.round(body.stockPrice)) }),
      ...(body.budgetPrice !== undefined && { budgetPrice: Math.max(0, Math.round(body.budgetPrice)) }),
      ...(body.logbookPrice !== undefined && { logbookPrice: Math.max(0, Math.round(body.logbookPrice)) }),
      ...(body.twoSectionDiscountPct !== undefined && { twoSectionDiscountPct: Math.max(0, Math.min(100, Math.round(body.twoSectionDiscountPct))) }),
      ...(body.threeSectionDiscountPct !== undefined && { threeSectionDiscountPct: Math.max(0, Math.min(100, Math.round(body.threeSectionDiscountPct))) }),
      ...(body.fullAccessPrice !== undefined && { fullAccessPrice: Math.max(0, Math.round(body.fullAccessPrice)) }),
      ...(body.currency && { currency: body.currency.trim().toUpperCase() }),
    },
  });

  return c.json({
    success: true,
    settings: {
      repoPrice: updated.repoPrice,
      stockPrice: updated.stockPrice,
      budgetPrice: updated.budgetPrice,
      logbookPrice: updated.logbookPrice,
      twoSectionDiscountPct: updated.twoSectionDiscountPct,
      threeSectionDiscountPct: updated.threeSectionDiscountPct,
      fullAccessPrice: updated.fullAccessPrice,
      currency: updated.currency,
      razorpayKeyId: getRazorpayKeyId(),
      isRazorpayConfigured: isRazorpayConfigured(),
    },
  });
});

// GET /api/lms/access - Fetch logged-in user's unlocked LMS sections
lmsRoutes.get("/access", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // ADMIN gets full access to all sections automatically
  if (user?.role === "ADMIN") {
    return c.json({
      isAdmin: true,
      hasFullAccess: true,
      sections: ["lms_repo", "lms_stock", "lms_budget", "lms_logbook", "lms_access", "lms_full"],
    });
  }

  const userAccesses = await prisma.lmsAccess.findMany({
    where: { userId },
  });

  const sectionKeys = new Set<string>();
  // Free section for all authenticated users
  sectionKeys.add("lms_access");

  for (const acc of userAccesses) {
    if (acc.expiresAt && acc.expiresAt < new Date()) continue; // expired check
    if (acc.section === "lms_full") {
      sectionKeys.add("lms_repo");
      sectionKeys.add("lms_stock");
      sectionKeys.add("lms_budget");
      sectionKeys.add("lms_logbook");
      sectionKeys.add("lms_full");
    } else {
      sectionKeys.add(acc.section);
    }
  }

  const sectionsList = Array.from(sectionKeys);
  const hasFullAccess =
    sectionsList.includes("lms_full") ||
    (sectionsList.includes("lms_repo") &&
      sectionsList.includes("lms_stock") &&
      sectionsList.includes("lms_budget") &&
      sectionsList.includes("lms_logbook"));

  return c.json({
    isAdmin: false,
    hasFullAccess,
    sections: sectionsList,
  });
});

// Helper for price calculation given requested sections
export function calculateLmsPrice(
  sections: string[],
  settings: {
    repoPrice: number;
    stockPrice: number;
    budgetPrice: number;
    logbookPrice: number;
    twoSectionDiscountPct: number;
    threeSectionDiscountPct: number;
    fullAccessPrice: number;
  }
) {
  const uniqueSections = Array.from(new Set(sections)).filter(
    (s) => s !== "lms_access"
  );

  if (uniqueSections.includes("lms_full") || uniqueSections.length >= 4) {
    return {
      finalAmount: settings.fullAccessPrice,
      originalAmount:
        settings.repoPrice +
        settings.stockPrice +
        settings.budgetPrice +
        settings.logbookPrice,
      discountPct: Math.round(
        (1 -
          settings.fullAccessPrice /
            (settings.repoPrice +
              settings.stockPrice +
              settings.budgetPrice +
              settings.logbookPrice)) *
          100
      ),
      isFullPass: true,
      selectedSections: ["lms_repo", "lms_stock", "lms_budget", "lms_logbook"],
    };
  }

  if (uniqueSections.length === 0) {
    return { finalAmount: 0, originalAmount: 0, discountPct: 0, isFullPass: false, selectedSections: [] };
  }

  const sectionPrices: Record<string, number> = {
    lms_repo: settings.repoPrice,
    lms_stock: settings.stockPrice,
    lms_budget: settings.budgetPrice,
    lms_logbook: settings.logbookPrice,
  };

  let rawTotal = 0;
  for (const s of uniqueSections) {
    rawTotal += sectionPrices[s] || 0;
  }

  let discountPct = 0;
  if (uniqueSections.length === 2) {
    discountPct = settings.twoSectionDiscountPct;
  } else if (uniqueSections.length === 3) {
    discountPct = settings.threeSectionDiscountPct;
  }

  const finalAmount = Math.round(rawTotal * (1 - discountPct / 100));

  return {
    finalAmount,
    originalAmount: rawTotal,
    discountPct,
    isFullPass: false,
    selectedSections: uniqueSections,
  };
}

// POST /api/lms/create-order - Initiate order for selected section bundle
lmsRoutes.post("/create-order", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HTTPException(404, { message: "User not found" });

  const body = await c.req.json<{
    sections?: string[];
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  }>();

  if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
    throw new HTTPException(400, { message: "At least one section must be selected." });
  }

  const settings = await getOrCreateLmsSettings();
  const pricing = calculateLmsPrice(body.sections, settings);

  if (pricing.finalAmount <= 0) {
    throw new HTTPException(400, { message: "Invalid section selection or price." });
  }

  const customerName = body.customerName || user.name || "Customer";
  const customerEmail = body.customerEmail || user.email;
  const customerPhone = body.customerPhone || "";

  // If Razorpay is not configured, create completed payment & grant access directly (Dev Mode / Free Trial)
  if (!isRazorpayConfigured()) {
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: pricing.finalAmount,
        currency: settings.currency,
        status: "COMPLETED",
        completedAt: new Date(),
        customerName,
        customerEmail,
        customerPhone,
        itemTitle: pricing.isFullPass
          ? "Full LMS Pass"
          : `LMS Sections: ${pricing.selectedSections.join(", ")}`,
        lmsSections: pricing.isFullPass ? ["lms_full"] : pricing.selectedSections,
      },
    });

    const targetSections = pricing.isFullPass
      ? ["lms_repo", "lms_stock", "lms_budget", "lms_logbook", "lms_full"]
      : pricing.selectedSections;

    for (const sec of targetSections) {
      await prisma.lmsAccess.upsert({
        where: { userId_section: { userId, section: sec } },
        create: { userId, section: sec, grantedBy: "PAYMENT", paymentId: payment.id },
        update: { grantedBy: "PAYMENT", paymentId: payment.id },
      });
    }

    notifyLmsPaymentCompleted({ paymentId: payment.id }).catch((err) =>
      console.error("[lms] Dev payment email error:", err)
    );

    return c.json({
      isDevMode: true,
      completed: true,
      paymentId: payment.id,
      message: "Payment auto-completed in dev mode!",
    });
  }

  // Create Razorpay Order
  const itemTitle = pricing.isFullPass
    ? "Full LMS Pass"
    : `LMS Sections (${pricing.selectedSections.length})`;

  const razorpayOrder = await createRazorpayOrder({
    amount: pricing.finalAmount,
    currency: settings.currency,
    receipt: `lms_${Date.now().toString().slice(-8)}`,
    notes: {
      userId,
      type: "LMS_SECTION_PURCHASE",
      sections: (pricing.isFullPass ? ["lms_full"] : pricing.selectedSections).join(","),
    },
  });

  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: pricing.finalAmount,
      currency: settings.currency,
      provider: "RAZORPAY",
      providerOrderId: razorpayOrder.id,
      status: "PENDING",
      customerName,
      customerEmail,
      customerPhone,
      itemTitle,
      lmsSections: pricing.isFullPass ? ["lms_full"] : pricing.selectedSections,
    },
  });

  return c.json({
    orderId: razorpayOrder.id,
    amount: pricing.finalAmount,
    currency: settings.currency,
    keyId: getRazorpayKeyId(),
    paymentId: payment.id,
    itemTitle,
    customerName,
    customerEmail,
    customerPhone,
  });
});

// POST /api/lms/verify-payment - Verify Razorpay payment and grant section access
lmsRoutes.post("/verify-payment", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const body = await c.req.json<{
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }>();

  if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
    throw new HTTPException(400, { message: "Missing Razorpay verification parameters" });
  }

  const isValid = verifyRazorpaySignature(
    body.razorpay_order_id,
    body.razorpay_payment_id,
    body.razorpay_signature
  );

  if (!isValid) {
    throw new HTTPException(400, { message: "Payment verification failed. Invalid signature." });
  }

  const payment = await prisma.payment.findFirst({
    where: { providerOrderId: body.razorpay_order_id, userId },
  });

  if (!payment) {
    throw new HTTPException(404, { message: "Matching payment record not found." });
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      providerPaymentId: body.razorpay_payment_id,
    },
  });

  const sectionsToGrant = updatedPayment.lmsSections.includes("lms_full")
    ? ["lms_repo", "lms_stock", "lms_budget", "lms_logbook", "lms_full"]
    : updatedPayment.lmsSections;

  for (const sec of sectionsToGrant) {
    await prisma.lmsAccess.upsert({
      where: { userId_section: { userId, section: sec } },
      create: { userId, section: sec, grantedBy: "PAYMENT", paymentId: updatedPayment.id },
      update: { grantedBy: "PAYMENT", paymentId: updatedPayment.id },
    });
  }

  notifyLmsPaymentCompleted({ paymentId: updatedPayment.id }).catch((err) =>
    console.error("[lms] Failed to send payment email:", err)
  );

  return c.json({
    success: true,
    message: "Payment verified successfully! Access granted.",
    unlockedSections: sectionsToGrant,
  });
});
