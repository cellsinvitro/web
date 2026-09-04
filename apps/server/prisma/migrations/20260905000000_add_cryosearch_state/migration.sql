CREATE TABLE "CryoSearchState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labs" JSONB NOT NULL,
    "activities" JSONB NOT NULL,
    "receivedRequests" JSONB NOT NULL,
    "sentRequests" JSONB NOT NULL,
    "allowedUsers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryoSearchState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CryoSearchState_userId_key" ON "CryoSearchState"("userId");

ALTER TABLE "CryoSearchState" ADD CONSTRAINT "CryoSearchState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;