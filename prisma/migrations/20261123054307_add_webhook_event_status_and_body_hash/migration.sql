/*
  Warnings:

  - A unique constraint covering the columns `[bodyHash]` on the table `WebhookEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('PROCESSED', 'UNMATCHED', 'IGNORED');

-- AlterTable
ALTER TABLE "WebhookEvent" ADD COLUMN     "bodyHash" TEXT,
ADD COLUMN     "status" "WebhookEventStatus" NOT NULL DEFAULT 'PROCESSED';

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_bodyHash_key" ON "WebhookEvent"("bodyHash");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");
