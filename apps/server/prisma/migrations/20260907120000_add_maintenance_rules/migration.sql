-- CreateEnum
CREATE TYPE "MaintenanceScope" AS ENUM ('WEB_PATH', 'API_PATH');

-- CreateTable
CREATE TABLE "MaintenanceRule" (
    "id" TEXT NOT NULL,
    "targetPath" TEXT NOT NULL,
    "scope" "MaintenanceScope" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRule_scope_targetPath_key" ON "MaintenanceRule"("scope", "targetPath");
CREATE INDEX "MaintenanceRule_scope_enabled_idx" ON "MaintenanceRule"("scope", "enabled");

-- AddForeignKey
ALTER TABLE "MaintenanceRule" ADD CONSTRAINT "MaintenanceRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
