-- CreateTable: BudgetHead
CREATE TABLE "BudgetHead" (
    "id"          TEXT NOT NULL,
    "budgetId"    TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetHead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetHead_budgetId_sortOrder_idx" ON "BudgetHead"("budgetId", "sortOrder");

-- AddForeignKey
ALTER TABLE "BudgetHead" ADD CONSTRAINT "BudgetHead_budgetId_fkey"
    FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: BudgetFormField — add optional headId
ALTER TABLE "BudgetFormField" ADD COLUMN "headId" TEXT;

-- CreateIndex
CREATE INDEX "BudgetFormField_headId_idx" ON "BudgetFormField"("headId");

-- AddForeignKey
ALTER TABLE "BudgetFormField" ADD CONSTRAINT "BudgetFormField_headId_fkey"
    FOREIGN KEY ("headId") REFERENCES "BudgetHead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: BudgetSubmission — add optional headId
ALTER TABLE "BudgetSubmission" ADD COLUMN "headId" TEXT;

-- CreateIndex
CREATE INDEX "BudgetSubmission_headId_idx" ON "BudgetSubmission"("headId");

-- AddForeignKey
ALTER TABLE "BudgetSubmission" ADD CONSTRAINT "BudgetSubmission_headId_fkey"
    FOREIGN KEY ("headId") REFERENCES "BudgetHead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
