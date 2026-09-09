-- DropForeignKey
ALTER TABLE "BudgetEntry" DROP CONSTRAINT IF EXISTS "BudgetEntry_budgetId_fkey";
ALTER TABLE "BudgetEntry" DROP CONSTRAINT IF EXISTS "BudgetEntry_categoryId_fkey";
ALTER TABLE "BudgetEntry" DROP CONSTRAINT IF EXISTS "BudgetEntry_userId_fkey";
ALTER TABLE "BudgetCategory" DROP CONSTRAINT IF EXISTS "BudgetCategory_budgetId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Budget_active_createdAt_idx";
DROP INDEX IF EXISTS "BudgetCategory_budgetId_sortOrder_idx";
DROP INDEX IF EXISTS "BudgetEntry_budgetId_date_idx";
DROP INDEX IF EXISTS "BudgetEntry_userId_idx";
DROP INDEX IF EXISTS "BudgetEntry_categoryId_idx";

-- DropTable
DROP TABLE IF EXISTS "BudgetSubmissionValue";
DROP TABLE IF EXISTS "BudgetSubmission";
DROP TABLE IF EXISTS "BudgetFormField";
DROP TABLE IF EXISTS "BudgetEntry";
DROP TABLE IF EXISTS "BudgetCategory";
DROP TABLE IF EXISTS "Budget";

-- DropEnum
DROP TYPE IF EXISTS "BudgetEntryType";
DROP TYPE IF EXISTS "BudgetFieldType";
DROP TYPE IF EXISTS "BudgetFieldDirection";

-- CreateEnum
CREATE TYPE "BudgetFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE');

-- CreateEnum
CREATE TYPE "BudgetFieldDirection" AS ENUM ('EXPENSE', 'ADDITION', 'NONE');

-- CreateTable: Budget (user-owned)
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "allocatedAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BudgetFormField (global, admin-managed)
CREATE TABLE "BudgetFormField" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "BudgetFieldType" NOT NULL,
    "direction" "BudgetFieldDirection" NOT NULL DEFAULT 'NONE',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BudgetSubmission (one form fill per budget)
CREATE TABLE "BudgetSubmission" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "netEffect" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BudgetSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BudgetSubmissionValue (per-field value within a submission)
CREATE TABLE "BudgetSubmissionValue" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "BudgetSubmissionValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Budget_ownerId_createdAt_idx" ON "Budget"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "BudgetFormField_sortOrder_idx" ON "BudgetFormField"("sortOrder");

-- CreateIndex
CREATE INDEX "BudgetSubmission_budgetId_submittedAt_idx" ON "BudgetSubmission"("budgetId", "submittedAt");

-- CreateIndex
CREATE INDEX "BudgetSubmission_userId_idx" ON "BudgetSubmission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetSubmissionValue_submissionId_fieldId_key" ON "BudgetSubmissionValue"("submissionId", "fieldId");

-- CreateIndex
CREATE INDEX "BudgetSubmissionValue_submissionId_idx" ON "BudgetSubmissionValue"("submissionId");

-- CreateIndex
CREATE INDEX "BudgetSubmissionValue_fieldId_idx" ON "BudgetSubmissionValue"("fieldId");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSubmission" ADD CONSTRAINT "BudgetSubmission_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSubmission" ADD CONSTRAINT "BudgetSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSubmissionValue" ADD CONSTRAINT "BudgetSubmissionValue_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "BudgetSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSubmissionValue" ADD CONSTRAINT "BudgetSubmissionValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "BudgetFormField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
