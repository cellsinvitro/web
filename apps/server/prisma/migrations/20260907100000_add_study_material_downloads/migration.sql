-- CreateTable
CREATE TABLE "StudyMaterialDownload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyMaterialDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyMaterialDownload_userId_createdAt_idx" ON "StudyMaterialDownload"("userId", "createdAt");
CREATE INDEX "StudyMaterialDownload_fileId_createdAt_idx" ON "StudyMaterialDownload"("fileId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudyMaterialDownload" ADD CONSTRAINT "StudyMaterialDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyMaterialDownload" ADD CONSTRAINT "StudyMaterialDownload_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StudyMaterialFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;