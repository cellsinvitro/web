-- AlterTable Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "toolPlanId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_toolPlanId_idx" ON "Payment"("toolPlanId");

-- CreateTable ToolGeneralSetting
CREATE TABLE IF NOT EXISTS "ToolGeneralSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "dailyFreeLimit" INTEGER NOT NULL DEFAULT 1,
    "publicBrowseEnabled" BOOLEAN NOT NULL DEFAULT true,
    "toolsSectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "loginRequiredMessage" TEXT NOT NULL DEFAULT 'Please login to calculate',
    "quotaExceededMessage" TEXT NOT NULL DEFAULT 'You''ve reached your daily calculation limit.',
    "subscriptionCtaTitle" TEXT NOT NULL DEFAULT 'Tools Unlimited Access',
    "subscriptionCtaDescription" TEXT NOT NULL DEFAULT 'Unlock unlimited calculations across all scientific tools, including future additions.',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolGeneralSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable ToolDefinition
CREATE TABLE IF NOT EXISTS "ToolDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ToolDefinition_key_key" ON "ToolDefinition"("key");
CREATE INDEX IF NOT EXISTS "ToolDefinition_sortOrder_idx" ON "ToolDefinition"("sortOrder");

-- CreateTable ToolSubscriptionPlan
CREATE TABLE IF NOT EXISTS "ToolSubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationUnit" TEXT NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "regularPrice" INTEGER NOT NULL,
    "offerPrice" INTEGER,
    "offerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "offerStartsAt" TIMESTAMP(3),
    "offerEndsAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolSubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ToolSubscriptionPlan_sortOrder_idx" ON "ToolSubscriptionPlan"("sortOrder");
CREATE INDEX IF NOT EXISTS "ToolSubscriptionPlan_published_idx" ON "ToolSubscriptionPlan"("published");

-- CreateTable UserToolSubscription
CREATE TABLE IF NOT EXISTS "UserToolSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToolSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserToolSubscription_userId_status_idx" ON "UserToolSubscription"("userId", "status");
CREATE INDEX IF NOT EXISTS "UserToolSubscription_expiresAt_idx" ON "UserToolSubscription"("expiresAt");

-- CreateTable ToolSubscriptionAudit
CREATE TABLE IF NOT EXISTS "ToolSubscriptionAudit" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolSubscriptionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ToolSubscriptionAudit_userId_idx" ON "ToolSubscriptionAudit"("userId");
CREATE INDEX IF NOT EXISTS "ToolSubscriptionAudit_subscriptionId_idx" ON "ToolSubscriptionAudit"("subscriptionId");
CREATE INDEX IF NOT EXISTS "ToolSubscriptionAudit_createdAt_idx" ON "ToolSubscriptionAudit"("createdAt");

-- CreateTable ToolDailyUsage
CREATE TABLE IF NOT EXISTS "ToolDailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolKey" TEXT NOT NULL,
    "usageDate" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ToolDailyUsage_userId_toolKey_usageDate_key" ON "ToolDailyUsage"("userId", "toolKey", "usageDate");
CREATE INDEX IF NOT EXISTS "ToolDailyUsage_userId_usageDate_idx" ON "ToolDailyUsage"("userId", "usageDate");
CREATE INDEX IF NOT EXISTS "ToolDailyUsage_usageDate_idx" ON "ToolDailyUsage"("usageDate");

-- CreateTable UserToolQuotaOverride
CREATE TABLE IF NOT EXISTS "UserToolQuotaOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyLimit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToolQuotaOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserToolQuotaOverride_userId_key" ON "UserToolQuotaOverride"("userId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_toolPlanId_fkey" FOREIGN KEY ("toolPlanId") REFERENCES "ToolSubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToolSubscription" ADD CONSTRAINT "UserToolSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserToolSubscription" ADD CONSTRAINT "UserToolSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ToolSubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserToolSubscription" ADD CONSTRAINT "UserToolSubscription_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolSubscriptionAudit" ADD CONSTRAINT "ToolSubscriptionAudit_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserToolSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToolSubscriptionAudit" ADD CONSTRAINT "ToolSubscriptionAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolDailyUsage" ADD CONSTRAINT "ToolDailyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToolQuotaOverride" ADD CONSTRAINT "UserToolQuotaOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
