-- CreateEnum
CREATE TYPE "ConsultancyStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "ConsultancyCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsultancyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultant" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "photoUrl" TEXT,
    "expertise" TEXT[] NOT NULL,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "consultationTypes" TEXT[] NOT NULL DEFAULT ARRAY['VIDEO', 'AUDIO']::TEXT[],
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "hourlyRate" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Consultant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantSlot" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsultantSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultancyBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "consultationType" TEXT NOT NULL,
    "status" "ConsultancyStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "userPhone" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsultancyBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultancyCategory_published_sortOrder_idx" ON "ConsultancyCategory"("published", "sortOrder");
CREATE INDEX "Consultant_categoryId_idx" ON "Consultant"("categoryId");
CREATE INDEX "Consultant_available_sortOrder_idx" ON "Consultant"("available", "sortOrder");
CREATE INDEX "ConsultantSlot_consultantId_date_idx" ON "ConsultantSlot"("consultantId", "date");
CREATE UNIQUE INDEX "ConsultantSlot_consultantId_date_startTime_endTime_key" ON "ConsultantSlot"("consultantId", "date", "startTime", "endTime");
CREATE INDEX "ConsultancyBooking_userId_idx" ON "ConsultancyBooking"("userId");
CREATE INDEX "ConsultancyBooking_consultantId_idx" ON "ConsultancyBooking"("consultantId");
CREATE INDEX "ConsultancyBooking_status_idx" ON "ConsultancyBooking"("status");
CREATE INDEX "ConsultancyBooking_providerOrderId_idx" ON "ConsultancyBooking"("providerOrderId");

-- AddForeignKey
ALTER TABLE "Consultant" ADD CONSTRAINT "Consultant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ConsultancyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultantSlot" ADD CONSTRAINT "ConsultantSlot_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultancyBooking" ADD CONSTRAINT "ConsultancyBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultancyBooking" ADD CONSTRAINT "ConsultancyBooking_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultancyBooking" ADD CONSTRAINT "ConsultancyBooking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ConsultancyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultancyBooking" ADD CONSTRAINT "ConsultancyBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ConsultantSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
