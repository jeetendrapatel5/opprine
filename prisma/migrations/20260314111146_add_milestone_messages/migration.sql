-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('CLIENT', 'FREELANCER');

-- CreateTable
CREATE TABLE "MilestoneMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "milestoneId" TEXT NOT NULL,

    CONSTRAINT "MilestoneMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MilestoneMessage" ADD CONSTRAINT "MilestoneMessage_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
