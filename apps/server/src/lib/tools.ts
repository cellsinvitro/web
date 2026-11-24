import { prisma } from "./prisma.js";

export const DEFAULT_TOOLS = [
  {
    key: "ic50",
    name: "IC₅₀ Calculator",
    description: "Fit dose-response inhibition curves with 4-parameter logistic regression and calculate IC₅₀ / EC₅₀ values.",
    route: "/tools/ic50",
    sortOrder: 1,
  },
  {
    key: "cell-counting",
    name: "Cell Counting Calculator",
    description: "Standard hemocytometer calculation for cell concentration, total cell count, and viability percentage.",
    route: "/tools/cell-counting",
    sortOrder: 2,
  },
  {
    key: "molarity",
    name: "Molarity Calculator",
    description: "Calculate required solute mass or resulting solution molarity with comprehensive unit conversion.",
    route: "/tools/molarity",
    sortOrder: 3,
  },
  {
    key: "dilution",
    name: "Dilution Calculator",
    description: "Calculate the stock solution volume and diluent required to prepare a desired concentration and final volume.",
    route: "/tools/dilution",
    sortOrder: 4,
  },
] as const;

export const DEFAULT_PLANS = [
  {
    name: "1 Day",
    durationUnit: "DAY",
    durationValue: 1,
    regularPrice: 49,
    offerPrice: 9,
    offerEnabled: true,
    currency: "INR",
    sortOrder: 1,
    description: "Full unlimited access to all scientific tools for 24 hours.",
    features: [
      "Unlimited calculations",
      "All 4 scientific calculators",
      "Dynamic export & reporting",
      "Full access for 1 day",
    ],
  },
  {
    name: "1 Week",
    durationUnit: "WEEK",
    durationValue: 1,
    regularPrice: 99,
    offerPrice: 29,
    offerEnabled: true,
    currency: "INR",
    sortOrder: 2,
    description: "7 days of uninterrupted bench research calculations.",
    features: [
      "Unlimited calculations",
      "All current scientific calculators",
      "Future tools added during period",
      "Full access for 7 days",
    ],
  },
  {
    name: "1 Month",
    durationUnit: "MONTH",
    durationValue: 1,
    regularPrice: 199,
    offerPrice: 49,
    offerEnabled: true,
    currency: "INR",
    sortOrder: 3,
    description: "Ideal for ongoing lab projects, thesis work, and routine assay runs.",
    features: [
      "Unlimited calculations",
      "All current & future scientific tools",
      "Priority server processing",
      "Full access for 30 days",
    ],
  },
  {
    name: "1 Year",
    durationUnit: "YEAR",
    durationValue: 1,
    regularPrice: 999,
    offerPrice: 249,
    offerEnabled: true,
    currency: "INR",
    sortOrder: 4,
    description: "Annual lab pass for students, researchers, and biotech professionals.",
    features: [
      "Unlimited calculations for a full year",
      "All current & upcoming tools included",
      "Zero per-calculation fees",
      "Best long-term value",
    ],
  },
] as const;

export function getKolkataDateString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

export async function ensureToolDefaults() {
  // 1. General Settings
  let general = await prisma.toolGeneralSetting.findUnique({
    where: { id: "default" },
  });
  if (!general) {
    general = await prisma.toolGeneralSetting.create({
      data: {
        id: "default",
        dailyFreeLimit: 1,
        publicBrowseEnabled: true,
        toolsSectionEnabled: true,
        loginRequiredMessage: "Please login to calculate",
        quotaExceededMessage: "You've reached your daily calculation limit.",
        subscriptionCtaTitle: "Tools Unlimited Access",
        subscriptionCtaDescription: "Unlock unlimited calculations across all scientific tools, including future additions.",
      },
    });
  }

  // 2. Tool Definitions
  for (const tool of DEFAULT_TOOLS) {
    await prisma.toolDefinition.upsert({
      where: { key: tool.key },
      create: {
        key: tool.key,
        name: tool.name,
        description: tool.description,
        route: tool.route,
        sortOrder: tool.sortOrder,
        enabled: true,
        published: true,
      },
      update: {
        // preserve existing if updated, but ensure sort order and route are present
      },
    });
  }

  // 3. Subscription Plans
  const existingPlans = await prisma.toolSubscriptionPlan.count();
  if (existingPlans === 0) {
    for (const plan of DEFAULT_PLANS) {
      await prisma.toolSubscriptionPlan.create({
        data: {
          name: plan.name,
          durationUnit: plan.durationUnit,
          durationValue: plan.durationValue,
          regularPrice: plan.regularPrice,
          offerPrice: plan.offerPrice,
          offerEnabled: plan.offerEnabled,
          currency: plan.currency,
          sortOrder: plan.sortOrder,
          description: plan.description,
          features: [...plan.features],
          published: true,
        },
      });
    }
  }

  return { general };
}

export async function checkUserToolAccess(userId: string) {
  const now = new Date();
  const activeSub = await prisma.userToolSubscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { gt: now },
    },
    include: { plan: true },
    orderBy: { expiresAt: "desc" },
  });

  if (activeSub) {
    return {
      isSubscriber: true,
      unlimited: true,
      subscription: {
        id: activeSub.id,
        planName: activeSub.plan?.name || "Unlimited",
        expiresAt: activeSub.expiresAt.toISOString(),
      },
      dailyLimit: null,
      usedToday: 0,
      remainingToday: null,
    };
  }

  const today = getKolkataDateString(now);

  const [override, generalSetting, usageAgg] = await Promise.all([
    prisma.userToolQuotaOverride.findUnique({ where: { userId } }),
    prisma.toolGeneralSetting.findUnique({ where: { id: "default" } }),
    prisma.toolDailyUsage.aggregate({
      where: { userId, usageDate: today },
      _sum: { count: true },
    }),
  ]);

  const dailyLimit = override ? override.dailyLimit : (generalSetting?.dailyFreeLimit ?? 1);
  const usedToday = usageAgg._sum.count ?? 0;
  const remainingToday = Math.max(0, dailyLimit - usedToday);

  return {
    isSubscriber: false,
    unlimited: false,
    subscription: null,
    dailyLimit,
    usedToday,
    remainingToday,
  };
}

export async function consumeToolUsage(userId: string, toolKey: string) {
  const now = new Date();
  const today = getKolkataDateString(now);

  return prisma.$transaction(async (tx) => {
    // Check if active subscriber
    const activeSub = await tx.userToolSubscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
      include: { plan: true },
      orderBy: { expiresAt: "desc" },
    });

    if (activeSub) {
      // Record usage for subscriber analytics
      await tx.toolDailyUsage.upsert({
        where: {
          userId_toolKey_usageDate: {
            userId,
            toolKey,
            usageDate: today,
          },
        },
        create: {
          userId,
          toolKey,
          usageDate: today,
          count: 1,
          lastUsedAt: now,
        },
        update: {
          count: { increment: 1 },
          lastUsedAt: now,
        },
      });

      return {
        allowed: true,
        isSubscriber: true,
        unlimited: true,
        subscriptionExpiresAt: activeSub.expiresAt.toISOString(),
        limit: null,
        used: null,
        remaining: null,
      };
    }

    // Free user check
    const [override, generalSetting, usageAgg] = await Promise.all([
      tx.userToolQuotaOverride.findUnique({ where: { userId } }),
      tx.toolGeneralSetting.findUnique({ where: { id: "default" } }),
      tx.toolDailyUsage.aggregate({
        where: { userId, usageDate: today },
        _sum: { count: true },
      }),
    ]);

    const dailyLimit = override ? override.dailyLimit : (generalSetting?.dailyFreeLimit ?? 1);
    const usedToday = usageAgg._sum.count ?? 0;

    if (usedToday >= dailyLimit) {
      return {
        allowed: false,
        isSubscriber: false,
        unlimited: false,
        message: generalSetting?.quotaExceededMessage || "You've reached your daily calculation limit.",
        limit: dailyLimit,
        used: usedToday,
        remaining: 0,
      };
    }

    // Atomically increment usage
    await tx.toolDailyUsage.upsert({
      where: {
        userId_toolKey_usageDate: {
          userId,
          toolKey,
          usageDate: today,
        },
      },
      create: {
        userId,
        toolKey,
        usageDate: today,
        count: 1,
        lastUsedAt: now,
      },
      update: {
        count: { increment: 1 },
        lastUsedAt: now,
      },
    });

    const newUsed = usedToday + 1;
    const remaining = Math.max(0, dailyLimit - newUsed);

    return {
      allowed: true,
      isSubscriber: false,
      unlimited: false,
      limit: dailyLimit,
      used: newUsed,
      remaining,
    };
  });
}

export async function fulfillToolSubscription(userId: string, planId: string, paymentId: string) {
  const plan = await prisma.toolSubscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) return null;

  const now = new Date();
  const existing = await prisma.userToolSubscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { gt: now },
    },
    orderBy: { expiresAt: "desc" },
  });

  const baseDate = existing ? new Date(existing.expiresAt) : new Date(now);
  const newExpiresAt = new Date(baseDate);
  const val = plan.durationValue;

  switch (plan.durationUnit.toUpperCase()) {
    case "DAY":
      newExpiresAt.setDate(newExpiresAt.getDate() + val);
      break;
    case "WEEK":
      newExpiresAt.setDate(newExpiresAt.getDate() + val * 7);
      break;
    case "MONTH": {
      const originalDay = newExpiresAt.getDate();
      newExpiresAt.setMonth(newExpiresAt.getMonth() + val);
      // Clamp to last day of month if rollover occurred (e.g. Jan 31 + 1 mo -> Feb 28)
      if (newExpiresAt.getDate() !== originalDay) {
        newExpiresAt.setDate(0);
      }
      break;
    }
    case "YEAR": {
      const originalDay = newExpiresAt.getDate();
      newExpiresAt.setFullYear(newExpiresAt.getFullYear() + val);
      if (newExpiresAt.getDate() !== originalDay) {
        newExpiresAt.setDate(0);
      }
      break;
    }
    default:
      newExpiresAt.setDate(newExpiresAt.getDate() + val);
  }

  const subscription = await prisma.userToolSubscription.create({
    data: {
      userId,
      planId: plan.id,
      paymentId,
      status: "ACTIVE",
      startsAt: existing ? existing.startsAt : now,
      expiresAt: newExpiresAt,
    },
  });

  if (existing) {
    await prisma.userToolSubscription.update({
      where: { id: existing.id },
      data: { status: "EXTENDED" },
    });
  }

  await prisma.toolSubscriptionAudit.create({
    data: {
      subscriptionId: subscription.id,
      userId,
      action: existing ? "EXTENDED" : "CREATED",
      metadata: {
        planName: plan.name,
        durationUnit: plan.durationUnit,
        durationValue: plan.durationValue,
        startsAt: subscription.startsAt.toISOString(),
        expiresAt: newExpiresAt.toISOString(),
        paymentId,
      },
    },
  });

  return subscription;
}
