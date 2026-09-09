CREATE TABLE "ToolSetting" (
    "toolKey" TEXT NOT NULL,
    "usageLimit" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ToolSetting_pkey" PRIMARY KEY ("toolKey")
);

CREATE TABLE "ToolUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolKey" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ToolUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ToolUsage_userId_toolKey_key" ON "ToolUsage"("userId", "toolKey");
CREATE INDEX "ToolUsage_toolKey_idx" ON "ToolUsage"("toolKey");
ALTER TABLE "ToolUsage" ADD CONSTRAINT "ToolUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;