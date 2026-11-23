-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('PROCESSED', 'UNMATCHED', 'IGNORED');

-- AlterTable
ALTER TABLE "WebhookEvent" ADD COLUMN     "bodyHash" TEXT,
ADD COLUMN     "status" "WebhookEventStatus" NOT NULL DEFAULT 'PROCESSED';

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_bodyHash_key" ON "WebhookEvent"("bodyHash");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");
