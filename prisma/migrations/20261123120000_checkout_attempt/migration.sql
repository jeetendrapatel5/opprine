-- CreateEnum
CREATE TYPE "CheckoutAttemptStatus" AS ENUM ('CREATED', 'COMPLETED', 'ABANDONED', 'CONFLICT');

-- CreateTable
CREATE TABLE "CheckoutAttempt" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "razorpayPlanId" TEXT NOT NULL,
    "razorpaySubscriptionId" TEXT NOT NULL,
    "replacedSubscriptionId" TEXT,
    "status" "CheckoutAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutAttempt_razorpaySubscriptionId_key" ON "CheckoutAttempt"("razorpaySubscriptionId");

-- CreateIndex
CREATE INDEX "CheckoutAttempt_workspaceId_status_idx" ON "CheckoutAttempt"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "CheckoutAttempt_replacedSubscriptionId_idx" ON "CheckoutAttempt"("replacedSubscriptionId");

-- AddForeignKey
ALTER TABLE "CheckoutAttempt" ADD CONSTRAINT "CheckoutAttempt_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
