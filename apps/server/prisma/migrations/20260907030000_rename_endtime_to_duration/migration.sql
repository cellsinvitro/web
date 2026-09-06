ALTER TABLE "LiveClass" RENAME COLUMN "endTime" TO "duration";
UPDATE "LiveClass" SET "duration" = 60 WHERE "duration" IS NULL;