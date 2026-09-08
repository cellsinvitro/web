CREATE TABLE "KitModule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KitModule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ResearchKit" ADD COLUMN "moduleId" TEXT;
CREATE INDEX "KitModule_parentId_sortOrder_idx" ON "KitModule"("parentId", "sortOrder");
CREATE INDEX "ResearchKit_moduleId_sortOrder_idx" ON "ResearchKit"("moduleId", "sortOrder");
ALTER TABLE "KitModule" ADD CONSTRAINT "KitModule_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KitModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchKit" ADD CONSTRAINT "ResearchKit_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "KitModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;