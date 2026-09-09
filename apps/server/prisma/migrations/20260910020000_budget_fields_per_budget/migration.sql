-- Drop old global index
DROP INDEX IF EXISTS "BudgetFormField_sortOrder_idx";

-- Add budgetId column (nullable first so existing rows don't violate NOT NULL)
ALTER TABLE "BudgetFormField" ADD COLUMN "budgetId" TEXT;

-- Delete any orphaned global fields (there are none in prod yet, safe to truncate)
DELETE FROM "BudgetFormField" WHERE "budgetId" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "BudgetFormField" ALTER COLUMN "budgetId" SET NOT NULL;

-- Add FK
ALTER TABLE "BudgetFormField" ADD CONSTRAINT "BudgetFormField_budgetId_fkey"
  FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- New composite index
CREATE INDEX "BudgetFormField_budgetId_sortOrder_idx" ON "BudgetFormField"("budgetId", "sortOrder");
