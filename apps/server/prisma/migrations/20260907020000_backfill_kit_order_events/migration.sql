UPDATE "Payment"
SET "fulfillmentStatus" = 'PROCESSING'
WHERE "kitId" IS NOT NULL AND "fulfillmentStatus" IS NULL;

INSERT INTO "KitOrderEvent" ("id", "paymentId", "status", "note", "createdAt")
SELECT
  md5('kit-order-event:' || p."id"),
  p."id",
  COALESCE(p."fulfillmentStatus", 'PROCESSING'::"KitFulfillmentStatus"),
  'Order received and being prepared.',
  p."createdAt"
FROM "Payment" p
WHERE p."kitId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "KitOrderEvent" e WHERE e."paymentId" = p."id"
  );
