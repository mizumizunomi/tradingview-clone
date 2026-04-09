-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'DEPOSIT_CONFIRMED', 'DEPOSIT_REJECTED', 'WITHDRAWAL_COMPLETED',
  'POSITION_CLOSED', 'KYC_APPROVED', 'KYC_REJECTED', 'SUPPORT_REPLY', 'SYSTEM'
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
