import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { getAccessTokenFromRequest } from "../lib/cookies.js";
import { verifyAccessToken } from "../lib/jwt.js";
import {
  ensureToolDefaults,
  checkUserToolAccess,
  consumeToolUsage,
  getKolkataDateString,
  DEFAULT_TOOLS,
} from "../lib/tools.js";

export const toolsRoutes = new Hono<{ Variables: AuthVariables }>();

// Helper to extract optional authenticated user without failing
async function getOptionalUser(c: any): Promise<string | null> {
  const token = getAccessTokenFromRequest(c);
  if (!token) return null;
  try {
    const user = await verifyAccessToken(token);
    return user.sub;
  } catch {
    return null;
  }
}

// ============================================================================
// PUBLIC & USER ENDPOINTS
// ============================================================================

/**
 * GET /tools/status
 * Authoritative endpoint for tool page loading:
 * returns settings, plans, tool definitions, and user quota/subscription state.
 */
toolsRoutes.get("/status", async (c) => {
  await ensureToolDefaults();

  const userId = await getOptionalUser(c);

  const [generalSetting, plans, toolDefinitions] = await Promise.all([
    prisma.toolGeneralSetting.findUnique({ where: { id: "default" } }),
    prisma.toolSubscriptionPlan.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.toolDefinition.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const now = new Date();
  const processedPlans = plans.map((plan) => {
    const isOfferActive =
      plan.offerEnabled &&
      plan.offerPrice !== null &&
      (!plan.offerStartsAt || plan.offerStartsAt <= now) &&
      (!plan.offerEndsAt || plan.offerEndsAt >= now);

    return {
      id: plan.id,
      name: plan.name,
      durationUnit: plan.durationUnit,
      durationValue: plan.durationValue,
      regularPrice: plan.regularPrice,
      offerPrice: plan.offerPrice,
      isOfferActive,
      effectivePrice: isOfferActive && plan.offerPrice !== null ? plan.offerPrice : plan.regularPrice,
      currency: plan.currency,
      features: plan.features,
      description: plan.description,
      sortOrder: plan.sortOrder,
    };
  });

  if (!userId) {
    return c.json({
      authenticated: false,
      isSubscriber: false,
      unlimited: false,
      subscription: null,
      dailyLimit: generalSetting?.dailyFreeLimit ?? 1,
      usedToday: 0,
      remainingToday: generalSetting?.dailyFreeLimit ?? 1,
      generalSetting: generalSetting || {
        dailyFreeLimit: 1,
        publicBrowseEnabled: true,
        toolsSectionEnabled: true,
        loginRequiredMessage: "Please login to calculate",
        quotaExceededMessage: "You've reached your daily calculation limit.",
        subscriptionCtaTitle: "Tools Unlimited Access",
        subscriptionCtaDescription: "Unlock unlimited calculations across all scientific tools, including future additions.",
      },
      plans: processedPlans,
      tools: toolDefinitions,
    });
  }

  const access = await checkUserToolAccess(userId);

  return c.json({
    authenticated: true,
    ...access,
    generalSetting: generalSetting || {
      dailyFreeLimit: 1,
      publicBrowseEnabled: true,
      toolsSectionEnabled: true,
      loginRequiredMessage: "Please login to calculate",
      quotaExceededMessage: "You've reached your daily calculation limit.",
      subscriptionCtaTitle: "Tools Unlimited Access",
      subscriptionCtaDescription: "Unlock unlimited calculations across all scientific tools, including future additions.",
    },
    plans: processedPlans,
    tools: toolDefinitions,
  });
});

function toLiters(value: number, unit: string): number {
  if (unit === "uL") return value / 1_000_000;
  if (unit === "mL") return value / 1_000;
  return value;
}

function toMolar(value: number, unit: string): number {
  if (unit === "uM") return value / 1_000_000;
  if (unit === "mM") return value / 1_000;
  return value;
}

function toGrams(value: number, unit: string): number {
  if (unit === "ug") return value / 1_000_000;
  if (unit === "mg") return value / 1_000;
  return value;
}

function toWeight(value: number, unit: string): number {
  if (unit === "ug/mL") return value / 1_000;
  return value;
}

/**
 * POST /tools/usage/:toolKey/consume
 * Atomically check subscription / daily quota and record usage.
 */
toolsRoutes.post("/usage/:toolKey/consume", requireAuth, async (c) => {
  const toolKey = c.req.param("toolKey");
  const userId = c.get("user").sub;

  await ensureToolDefaults();

  const result = await consumeToolUsage(userId, toolKey);

  if (!result.allowed) {
    throw new HTTPException(429, {
      message: result.message || "You've reached your daily calculation limit.",
    });
  }

  return c.json(result);
});

/**
 * POST /tools/calculate/:toolKey
 * Authoritative backend calculation route.
 * Validates scientific input first (no quota deduction on error),
 * verifies session and active subscription / daily quota,
 * atomically records usage, and returns calculated results with updated quota metadata.
 */
toolsRoutes.post("/calculate/:toolKey", requireAuth, async (c) => {
  const toolKey = c.req.param("toolKey");
  const userId = c.get("user").sub;
  const body = await c.req.json<any>();

  await ensureToolDefaults();

  let calculationResult: any = null;

  if (toolKey === "molarity") {
    const { mode } = body;
    if (mode === "mass") {
      const conc = Number(body.targetMolarity);
      const vol = Number(body.volume);
      const mw = Number(body.molecularWeight);
      if (!conc || conc <= 0) throw new HTTPException(400, { message: "Target concentration must be a positive number" });
      if (!vol || vol <= 0) throw new HTTPException(400, { message: "Volume must be a positive number" });
      if (!mw || mw <= 0) throw new HTTPException(400, { message: "Molecular weight must be a positive number" });

      const concM = toMolar(conc, body.targetMolarityUnit || "mM");
      const volL = toLiters(vol, body.volumeUnit || "mL");
      const grams = concM * volL * mw;
      calculationResult = {
        mode: "mass",
        calculatedMassGrams: grams,
        soluteMassGrams: grams,
        ug: grams * 1_000_000,
        mg: grams * 1_000,
        g: grams,
      };
    } else if (mode === "molarity") {
      const mass = Number(body.soluteMass);
      const vol = Number(body.volume);
      const mw = Number(body.molecularWeight);
      if (!mass || mass <= 0) throw new HTTPException(400, { message: "Solute mass must be a positive number" });
      if (!mw || mw <= 0) throw new HTTPException(400, { message: "Molecular weight must be a positive number" });
      if (!vol || vol <= 0) throw new HTTPException(400, { message: "Volume must be a positive number" });

      const massG = toGrams(mass, body.soluteMassUnit || "mg");
      const volL = toLiters(vol, body.volumeUnit || "mL");
      const molarityM = massG / (mw * volL);
      calculationResult = {
        mode: "molarity",
        calculatedMolarityBase: molarityM,
        uM: molarityM * 1_000_000,
        mM: molarityM * 1_000,
        M: molarityM,
      };
    } else {
      throw new HTTPException(400, { message: "Invalid mode for molarity calculator" });
    }
  } else if (toolKey === "dilution") {
    const { category, c1, c1Unit, c2, c2Unit, v2, v2Unit } = body;
    const c1Val = Number(c1);
    const c2Val = Number(c2);
    const v2Val = Number(v2);
    if (!c1Val || c1Val <= 0) throw new HTTPException(400, { message: "Stock concentration must be a positive number" });
    if (!c2Val || c2Val <= 0) throw new HTTPException(400, { message: "Required concentration must be a positive number" });
    if (!v2Val || v2Val <= 0) throw new HTTPException(400, { message: "Final volume must be a positive number" });

    let c1Base = 0;
    let c2Base = 0;
    if (category === "weight") {
      c1Base = toWeight(c1Val, c1Unit || "mg/mL");
      c2Base = toWeight(c2Val, c2Unit || "ug/mL");
    } else {
      c1Base = toMolar(c1Val, c1Unit || "mM");
      c2Base = toMolar(c2Val, c2Unit || "uM");
    }

    if (c1Base < c2Base) {
      throw new HTTPException(400, {
        message: "The stock concentration must be equal to or greater than the required concentration for a dilution.",
      });
    }

    const v2L = toLiters(v2Val, v2Unit || "mL");
    const v1L = (c2Base * v2L) / c1Base;
    const diluentL = Math.max(0, v2L - v1L);

    calculationResult = {
      v1Liters: v1L,
      diluentLiters: diluentL,
      v2Liters: v2L,
      v1Uliters: v1L * 1_000_000,
      v1Mliters: v1L * 1_000,
      diluentUliters: diluentL * 1_000_000,
      diluentMliters: diluentL * 1_000,
    };
  } else if (toolKey === "cell-counting") {
    const viable = Number(body.viableCells);
    const dead = Number(body.deadCells || 0);
    const squares = Number(body.squaresCounted);
    const df = Number(body.dilutionFactor || 1);
    const sampleVol = body.sampleVolume ? Number(body.sampleVolume) : null;

    if (Number.isNaN(viable) || viable < 0) throw new HTTPException(400, { message: "Viable cells counted must be non-negative" });
    if (!squares || squares <= 0) throw new HTTPException(400, { message: "Large squares counted must be positive" });
    if (!df || df <= 0) throw new HTTPException(400, { message: "Dilution factor must be positive" });
    if (sampleVol !== null && (Number.isNaN(sampleVol) || sampleVol <= 0)) {
      throw new HTTPException(400, { message: "Sample volume must be positive" });
    }

    const factor = Number(body.chamberFactor) || 10_000;
    const totalCounted = viable + dead;
    const concentrationCellsPerMl = (viable / squares) * df * factor;
    const viabilityPercentage = totalCounted > 0 ? (viable / totalCounted) * 100 : null;
    const totalCellsInSample = sampleVol !== null ? concentrationCellsPerMl * sampleVol : null;

    calculationResult = {
      concentrationCellsPerMl,
      viabilityPercentage,
      totalCellsInSample,
      viableCount: viable,
      deadCount: dead,
      totalCounted,
    };
  } else if (toolKey === "ic50") {
    if (!Array.isArray(body.points) || body.points.length < 4) {
      throw new HTTPException(400, { message: "At least 4 data points required for IC50 fitting" });
    }
    calculationResult = { verified: true, pointsCount: body.points.length };
  } else {
    calculationResult = { verified: true };
  }

  // Atomically consume quota now that validation has passed
  const usageResult = await consumeToolUsage(userId, toolKey);
  if (!usageResult.allowed) {
    throw new HTTPException(429, {
      message: usageResult.message || "You've reached your daily calculation limit.",
    });
  }

  return c.json({
    success: true,
    result: calculationResult,
    access: usageResult,
  });
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /tools/admin/settings
 * Read full general settings & tool definitions
 */
toolsRoutes.get("/admin/settings", requireAuth, requireAdmin, async (c) => {
  await ensureToolDefaults();

  const [generalSetting, tools] = await Promise.all([
    prisma.toolGeneralSetting.findUnique({ where: { id: "default" } }),
    prisma.toolDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return c.json({ generalSetting, tools });
});

/**
 * PATCH /tools/admin/settings
 * Update general configuration
 */
toolsRoutes.patch("/admin/settings", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<{
    dailyFreeLimit?: number;
    publicBrowseEnabled?: boolean;
    toolsSectionEnabled?: boolean;
    loginRequiredMessage?: string;
    quotaExceededMessage?: string;
    subscriptionCtaTitle?: string;
    subscriptionCtaDescription?: string;
  }>();

  let dailyFreeLimit: number | undefined;
  if (body.dailyFreeLimit !== undefined) {
    const parsed = Number(body.dailyFreeLimit);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new HTTPException(400, { message: "Daily free limit must be a non-negative integer" });
    }
    dailyFreeLimit = parsed;
  }

  const updated = await prisma.toolGeneralSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      dailyFreeLimit: dailyFreeLimit ?? 1,
      publicBrowseEnabled: body.publicBrowseEnabled ?? true,
      toolsSectionEnabled: body.toolsSectionEnabled ?? true,
      loginRequiredMessage: body.loginRequiredMessage || "Please login to calculate",
      quotaExceededMessage: body.quotaExceededMessage || "You've reached your daily calculation limit.",
      subscriptionCtaTitle: body.subscriptionCtaTitle || "Tools Unlimited Access",
      subscriptionCtaDescription: body.subscriptionCtaDescription || "Unlock unlimited calculations across all scientific tools, including future additions.",
    },
    update: {
      ...(dailyFreeLimit !== undefined ? { dailyFreeLimit } : {}),
      ...(body.publicBrowseEnabled !== undefined ? { publicBrowseEnabled: body.publicBrowseEnabled } : {}),
      ...(body.toolsSectionEnabled !== undefined ? { toolsSectionEnabled: body.toolsSectionEnabled } : {}),
      ...(body.loginRequiredMessage ? { loginRequiredMessage: body.loginRequiredMessage } : {}),
      ...(body.quotaExceededMessage ? { quotaExceededMessage: body.quotaExceededMessage } : {}),
      ...(body.subscriptionCtaTitle ? { subscriptionCtaTitle: body.subscriptionCtaTitle } : {}),
      ...(body.subscriptionCtaDescription ? { subscriptionCtaDescription: body.subscriptionCtaDescription } : {}),
    },
  });

  return c.json({ generalSetting: updated });
});

/**
 * PATCH /tools/admin/tools/:key
 * Update tool details (name, description, sort order, published, enabled)
 */
toolsRoutes.patch("/admin/tools/:key", requireAuth, requireAdmin, async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json<{
    name?: string;
    description?: string;
    sortOrder?: number;
    enabled?: boolean;
    published?: boolean;
  }>();

  const tool = await prisma.toolDefinition.update({
    where: { key },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.description ? { description: body.description } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      ...(body.published !== undefined ? { published: body.published } : {}),
    },
  });

  return c.json({ tool });
});

/**
 * GET /tools/admin/plans
 * List all plans
 */
toolsRoutes.get("/admin/plans", requireAuth, requireAdmin, async (c) => {
  await ensureToolDefaults();
  const plans = await prisma.toolSubscriptionPlan.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return c.json({ plans });
});

/**
 * POST /tools/admin/plans
 * Create new subscription plan
 */
toolsRoutes.post("/admin/plans", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<{
    name: string;
    durationUnit: string;
    durationValue: number;
    regularPrice: number;
    offerPrice?: number | null;
    offerEnabled?: boolean;
    offerStartsAt?: string | null;
    offerEndsAt?: string | null;
    features?: string[];
    description?: string;
    sortOrder?: number;
    published?: boolean;
  }>();

  if (!body.name || !body.durationUnit || !body.durationValue || body.regularPrice === undefined) {
    throw new HTTPException(400, { message: "Name, duration, and regular price are required" });
  }

  const plan = await prisma.toolSubscriptionPlan.create({
    data: {
      name: body.name.trim(),
      durationUnit: body.durationUnit.toUpperCase(),
      durationValue: Math.max(1, Number(body.durationValue)),
      regularPrice: Math.max(0, Number(body.regularPrice)),
      offerPrice: body.offerPrice !== undefined && body.offerPrice !== null ? Math.max(0, Number(body.offerPrice)) : null,
      offerEnabled: body.offerEnabled ?? true,
      offerStartsAt: body.offerStartsAt ? new Date(body.offerStartsAt) : null,
      offerEndsAt: body.offerEndsAt ? new Date(body.offerEndsAt) : null,
      features: body.features || [],
      description: body.description?.trim() || null,
      sortOrder: Number(body.sortOrder || 0),
      published: body.published ?? true,
    },
  });

  return c.json({ plan });
});

/**
 * PATCH /tools/admin/plans/:id
 * Update an existing plan
 */
toolsRoutes.patch("/admin/plans/:id", requireAuth, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    durationUnit?: string;
    durationValue?: number;
    regularPrice?: number;
    offerPrice?: number | null;
    offerEnabled?: boolean;
    offerStartsAt?: string | null;
    offerEndsAt?: string | null;
    features?: string[];
    description?: string;
    sortOrder?: number;
    published?: boolean;
  }>();

  const plan = await prisma.toolSubscriptionPlan.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.durationUnit ? { durationUnit: body.durationUnit.toUpperCase() } : {}),
      ...(body.durationValue !== undefined ? { durationValue: Math.max(1, Number(body.durationValue)) } : {}),
      ...(body.regularPrice !== undefined ? { regularPrice: Math.max(0, Number(body.regularPrice)) } : {}),
      ...(body.offerPrice !== undefined ? { offerPrice: body.offerPrice !== null ? Math.max(0, Number(body.offerPrice)) : null } : {}),
      ...(body.offerEnabled !== undefined ? { offerEnabled: body.offerEnabled } : {}),
      ...(body.offerStartsAt !== undefined ? { offerStartsAt: body.offerStartsAt ? new Date(body.offerStartsAt) : null } : {}),
      ...(body.offerEndsAt !== undefined ? { offerEndsAt: body.offerEndsAt ? new Date(body.offerEndsAt) : null } : {}),
      ...(body.features !== undefined ? { features: body.features } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      ...(body.published !== undefined ? { published: body.published } : {}),
    },
  });

  return c.json({ plan });
});

/**
 * DELETE /tools/admin/plans/:id
 */
toolsRoutes.delete("/admin/plans/:id", requireAuth, requireAdmin, async (c) => {
  const id = c.req.param("id");
  await prisma.toolSubscriptionPlan.delete({ where: { id } });
  return c.json({ success: true });
});

/**
 * GET /tools/admin/subscribers
 * Subscriber management list
 */
toolsRoutes.get("/admin/subscribers", requireAuth, requireAdmin, async (c) => {
  const search = c.req.query("search")?.trim().toLowerCase() || "";
  const status = c.req.query("status")?.trim().toUpperCase();

  const whereClause: any = {};
  if (status && status !== "ALL") {
    whereClause.status = status;
  }
  if (search) {
    whereClause.user = {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const subscriptions = await prisma.userToolSubscription.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      plan: { select: { id: true, name: true, durationUnit: true, durationValue: true } },
      payment: { select: { id: true, amount: true, provider: true, providerPaymentId: true, status: true } },
    },
    take: 100,
  });

  return c.json({ subscriptions });
});

/**
 * POST /tools/admin/subscribers/grant
 * Admin manually grant subscription access
 */
toolsRoutes.post("/admin/subscribers/grant", requireAuth, requireAdmin, async (c) => {
  const actorId = c.get("user").sub;
  const { userEmail, userId, planId, durationDays } = await c.req.json<{
    userEmail?: string;
    userId?: string;
    planId?: string;
    durationDays?: number;
  }>();

  let targetUser = null;
  if (userId) {
    targetUser = await prisma.user.findUnique({ where: { id: userId } });
  } else if (userEmail) {
    targetUser = await prisma.user.findUnique({ where: { email: userEmail.trim().toLowerCase() } });
  }

  if (!targetUser) throw new HTTPException(404, { message: "User not found" });

  const now = new Date();
  let days = durationDays || 30;
  let planRecord = null;
  if (planId) {
    planRecord = await prisma.toolSubscriptionPlan.findUnique({ where: { id: planId } });
    if (planRecord) {
      if (planRecord.durationUnit === "DAY") days = planRecord.durationValue;
      else if (planRecord.durationUnit === "WEEK") days = planRecord.durationValue * 7;
      else if (planRecord.durationUnit === "MONTH") days = planRecord.durationValue * 30;
      else if (planRecord.durationUnit === "YEAR") days = planRecord.durationValue * 365;
    }
  }

  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const sub = await prisma.userToolSubscription.create({
    data: {
      userId: targetUser.id,
      planId: planRecord?.id || null,
      status: "ACTIVE",
      startsAt: now,
      expiresAt,
    },
  });

  await prisma.toolSubscriptionAudit.create({
    data: {
      subscriptionId: sub.id,
      userId: targetUser.id,
      actorId,
      action: "ADMIN_GRANTED",
      metadata: { daysGranted: days, expiresAt: expiresAt.toISOString() },
    },
  });

  return c.json({ subscription: sub });
});

/**
 * PATCH /tools/admin/subscribers/:id/extend
 */
toolsRoutes.patch("/admin/subscribers/:id/extend", requireAuth, requireAdmin, async (c) => {
  const actorId = c.get("user").sub;
  const id = c.req.param("id");
  const { days, newExpiresAt } = await c.req.json<{ days?: number; newExpiresAt?: string }>();

  const sub = await prisma.userToolSubscription.findUnique({ where: { id } });
  if (!sub) throw new HTTPException(404, { message: "Subscription not found" });

  let updatedDate = new Date(sub.expiresAt);
  if (newExpiresAt) {
    updatedDate = new Date(newExpiresAt);
  } else if (days) {
    updatedDate.setDate(updatedDate.getDate() + Number(days));
  } else {
    updatedDate.setDate(updatedDate.getDate() + 7);
  }

  const updated = await prisma.userToolSubscription.update({
    where: { id },
    data: {
      expiresAt: updatedDate,
      status: updatedDate > new Date() ? "ACTIVE" : sub.status,
    },
  });

  await prisma.toolSubscriptionAudit.create({
    data: {
      subscriptionId: id,
      userId: sub.userId,
      actorId,
      action: "EXTENDED",
      metadata: { previousExpiresAt: sub.expiresAt.toISOString(), newExpiresAt: updatedDate.toISOString() },
    },
  });

  return c.json({ subscription: updated });
});

/**
 * POST /tools/admin/subscribers/:id/revoke
 */
toolsRoutes.post("/admin/subscribers/:id/revoke", requireAuth, requireAdmin, async (c) => {
  const actorId = c.get("user").sub;
  const id = c.req.param("id");

  const sub = await prisma.userToolSubscription.findUnique({ where: { id } });
  if (!sub) throw new HTTPException(404, { message: "Subscription not found" });

  const updated = await prisma.userToolSubscription.update({
    where: { id },
    data: { status: "REVOKED" },
  });

  await prisma.toolSubscriptionAudit.create({
    data: {
      subscriptionId: id,
      userId: sub.userId,
      actorId,
      action: "REVOKED",
      metadata: { revokedAt: new Date().toISOString() },
    },
  });

  return c.json({ subscription: updated });
});

/**
 * GET /tools/admin/usage
 * Real-time usage statistics
 */
toolsRoutes.get("/admin/usage", requireAuth, requireAdmin, async (c) => {
  const today = getKolkataDateString();
  const now = new Date();

  const [todayUsage, generalSetting, activeSubsCount] = await Promise.all([
    prisma.toolDailyUsage.findMany({
      where: { usageDate: today },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.toolGeneralSetting.findUnique({ where: { id: "default" } }),
    prisma.userToolSubscription.count({
      where: { status: "ACTIVE", expiresAt: { gt: now } },
    }),
  ]);

  const defaultLimit = generalSetting?.dailyFreeLimit ?? 1;

  // Active subscribers list of userIds
  const activeSubs = await prisma.userToolSubscription.findMany({
    where: { status: "ACTIVE", expiresAt: { gt: now } },
    select: { userId: true },
  });
  const subUserIds = new Set(activeSubs.map((s) => s.userId));

  let totalCalculationsToday = 0;
  let freeCalculations = 0;
  let subscriberCalculations = 0;
  const toolBreakdown: Record<string, number> = {
    ic50: 0,
    "cell-counting": 0,
    molarity: 0,
    dilution: 0,
  };
  const userMap = new Map<string, { user: any; count: number; isSubscriber: boolean }>();

  for (const record of todayUsage) {
    totalCalculationsToday += record.count;
    toolBreakdown[record.toolKey] = (toolBreakdown[record.toolKey] ?? 0) + record.count;

    const isSub = subUserIds.has(record.userId);
    if (isSub) subscriberCalculations += record.count;
    else freeCalculations += record.count;

    const existingUser = userMap.get(record.userId);
    if (existingUser) {
      existingUser.count += record.count;
    } else {
      userMap.set(record.userId, {
        user: record.user,
        count: record.count,
        isSubscriber: isSub,
      });
    }
  }

  const usersAtQuota = Array.from(userMap.values()).filter(
    (u) => !u.isSubscriber && u.count >= defaultLimit
  ).length;

  return c.json({
    date: today,
    totalCalculationsToday,
    uniqueUsersToday: userMap.size,
    freeCalculations,
    subscriberCalculations,
    activeSubscribers: activeSubsCount,
    usersAtQuota,
    toolBreakdown,
    usersList: Array.from(userMap.values()),
    defaultLimit,
  });
});

/**
 * POST /tools/admin/usage/override
 * Override specific user's quota
 */
toolsRoutes.post("/admin/usage/override", requireAuth, requireAdmin, async (c) => {
  const { userId, dailyLimit } = await c.req.json<{ userId: string; dailyLimit: number }>();
  if (!userId || dailyLimit === undefined || Number(dailyLimit) < 0) {
    throw new HTTPException(400, { message: "Valid userId and non-negative dailyLimit required" });
  }

  const override = await prisma.userToolQuotaOverride.upsert({
    where: { userId },
    create: { userId, dailyLimit: Number(dailyLimit) },
    update: { dailyLimit: Number(dailyLimit) },
  });

  return c.json({ override });
});

/**
 * POST /tools/admin/usage/reset
 * Reset user daily usage for today
 */
toolsRoutes.post("/admin/usage/reset", requireAuth, requireAdmin, async (c) => {
  const { userId } = await c.req.json<{ userId: string }>();
  if (!userId) throw new HTTPException(400, { message: "userId required" });

  const today = getKolkataDateString();
  await prisma.toolDailyUsage.deleteMany({
    where: { userId, usageDate: today },
  });

  return c.json({ success: true, message: "Usage reset for today" });
});

/**
 * GET /tools/admin/analytics
 * Real analytics from actual DB records
 */
toolsRoutes.get("/admin/analytics", requireAuth, requireAdmin, async (c) => {
  const now = new Date();

  const [
    activeSubscribers,
    payments,
    totalUsageAgg,
    plans,
    dailyUsageAgg,
    totalExpirations,
    totalRenewals,
    totalSubscribedUsers,
    totalRegisteredUsers,
  ] = await Promise.all([
    prisma.userToolSubscription.count({
      where: { status: "ACTIVE", expiresAt: { gt: now } },
    }),
    prisma.payment.findMany({
      where: {
        toolPlanId: { not: null },
        status: "COMPLETED",
      },
      include: { toolPlan: true },
    }),
    prisma.toolDailyUsage.groupBy({
      by: ["toolKey"],
      _sum: { count: true },
    }),
    prisma.toolSubscriptionPlan.findMany({ select: { id: true, name: true } }),
    prisma.toolDailyUsage.groupBy({
      by: ["usageDate"],
      _sum: { count: true },
      orderBy: { usageDate: "desc" },
      take: 7,
    }),
    prisma.userToolSubscription.count({
      where: { expiresAt: { lte: now } },
    }),
    prisma.toolSubscriptionAudit.count({
      where: { action: "EXTENDED" },
    }),
    prisma.userToolSubscription.groupBy({
      by: ["userId"],
    }),
    prisma.user.count(),
  ]);

  const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

  const revenueByPlan: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const plan of plans) {
    revenueByPlan[plan.id] = { name: plan.name, revenue: 0, count: 0 };
  }
  for (const p of payments) {
    if (p.toolPlanId) {
      const entry = revenueByPlan[p.toolPlanId];
      if (entry) {
        entry.revenue += p.amount;
        entry.count += 1;
      }
    }
  }

  let mostUsedCalculator = "—";
  let maxCount = -1;
  const usageByTool: Record<string, number> = {};
  for (const item of totalUsageAgg) {
    const count = item._sum.count ?? 0;
    usageByTool[item.toolKey] = count;
    if (count > maxCount) {
      maxCount = count;
      const def = DEFAULT_TOOLS.find((t) => t.key === item.toolKey);
      mostUsedCalculator = def ? def.name : item.toolKey;
    }
  }

  const conversionRate = totalRegisteredUsers > 0
    ? ((totalSubscribedUsers.length / totalRegisteredUsers) * 100).toFixed(1)
    : "0.0";

  const dailyVolume = dailyUsageAgg.map((d) => ({
    date: d.usageDate,
    count: d._sum.count ?? 0,
  }));

  return c.json({
    activeSubscribers,
    totalRevenue,
    revenueByPlan: Object.values(revenueByPlan),
    mostUsedCalculator,
    usageByTool,
    conversionRate: `${conversionRate}%`,
    totalSubscribedUsers: totalSubscribedUsers.length,
    totalRegisteredUsers,
    totalRenewals,
    totalExpirations,
    dailyVolume,
  });
});

// Legacy backwards-compatible routes
toolsRoutes.get("/admin", requireAuth, requireAdmin, async (c) => {
  await ensureToolDefaults();
  const settings = await prisma.toolSetting.findMany({ orderBy: { toolKey: "asc" } });
  return c.json({ settings });
});

toolsRoutes.patch("/admin/:toolKey", requireAuth, requireAdmin, async (c) => {
  const toolKey = c.req.param("toolKey");
  const body = await c.req.json<{ usageLimit?: number | null | string }>();
  let usageLimit: number | null = null;
  if (body.usageLimit !== null && body.usageLimit !== undefined && body.usageLimit !== "") {
    const parsedLimit = Number(body.usageLimit);
    if (!Number.isFinite(parsedLimit) || !Number.isInteger(parsedLimit) || parsedLimit < 0) {
      throw new HTTPException(400, { message: "Usage limit must be a non-negative whole number or blank" });
    }
    usageLimit = parsedLimit;
  }
  const setting = await prisma.toolSetting.upsert({
    where: { toolKey },
    create: { toolKey, usageLimit },
    update: { usageLimit },
  });
  return c.json({ setting });
});
