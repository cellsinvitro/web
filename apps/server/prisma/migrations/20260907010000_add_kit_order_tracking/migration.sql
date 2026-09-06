CREATE TYPE "KitFulfillmentStatus" AS ENUM (
  'PROCESSING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED'
);

ALTER TABLE "Payment"
ADD COLUMN "itemTitle" TEXT,
ADD COLUMN "unitAmount" INTEGER,
ADD COLUMN "fulfillmentStatus" "KitFulfillmentStatus",
ADD COLUMN "carrier" TEXT,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "estimatedDeliveryAt" TIMESTAMP(3),
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3);

CREATE TABLE "KitOrderEvent" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "status" "KitFulfillmentStatus" NOT NULL,
  "note" TEXT,
  "location" TEXT,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KitOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KitOrderEvent_paymentId_createdAt_idx" ON "KitOrderEvent"("paymentId", "createdAt");
CREATE INDEX "KitOrderEvent_status_idx" ON "KitOrderEvent"("status");

ALTER TABLE "KitOrderEvent"
ADD CONSTRAINT "KitOrderEvent_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KitOrderEvent"
ADD CONSTRAINT "KitOrderEvent_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
