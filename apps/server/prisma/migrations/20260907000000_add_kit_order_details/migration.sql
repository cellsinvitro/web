ALTER TABLE "Payment"
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "customerName" TEXT,
ADD COLUMN "customerEmail" TEXT,
ADD COLUMN "customerPhone" TEXT,
ADD COLUMN "shippingAddress" TEXT;
