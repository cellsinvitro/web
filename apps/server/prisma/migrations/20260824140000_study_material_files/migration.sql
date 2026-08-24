-- CreateTable
CREATE TABLE "StudyMaterialFile" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyMaterialFile_pkey" PRIMARY KEY ("id")
);

-- Migrate existing single-file resources into StudyMaterialFile rows
INSERT INTO "StudyMaterialFile" (
    "id",
    "materialId",
    "fileName",
    "mimeType",
    "fileSize",
    "storageKey",
    "createdAt",
    "updatedAt"
)
SELECT
    "id" || '_file',
    "id",
    "fileName",
    "mimeType",
    "fileSize",
    "storageKey",
    "createdAt",
    "updatedAt"
FROM "StudyMaterial";

-- Drop file columns from StudyMaterial
ALTER TABLE "StudyMaterial" DROP COLUMN "fileName";
ALTER TABLE "StudyMaterial" DROP COLUMN "mimeType";
ALTER TABLE "StudyMaterial" DROP COLUMN "fileSize";
ALTER TABLE "StudyMaterial" DROP COLUMN "storageKey";

-- CreateIndex
CREATE UNIQUE INDEX "StudyMaterialFile_storageKey_key" ON "StudyMaterialFile"("storageKey");
CREATE INDEX "StudyMaterialFile_materialId_idx" ON "StudyMaterialFile"("materialId");

-- AddForeignKey
ALTER TABLE "StudyMaterialFile" ADD CONSTRAINT "StudyMaterialFile_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "StudyMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
