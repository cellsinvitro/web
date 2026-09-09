-- BudgetFormField: drop placeholder + required, add defaultValue
ALTER TABLE "BudgetFormField" DROP COLUMN IF EXISTS "placeholder";
ALTER TABLE "BudgetFormField" DROP COLUMN IF EXISTS "required";
ALTER TABLE "BudgetFormField" ADD COLUMN "defaultValue" TEXT;

-- BudgetSubmission: add note
ALTER TABLE "BudgetSubmission" ADD COLUMN "note" TEXT;
