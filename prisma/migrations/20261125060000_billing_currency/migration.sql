-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE "CheckoutAttempt" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';
