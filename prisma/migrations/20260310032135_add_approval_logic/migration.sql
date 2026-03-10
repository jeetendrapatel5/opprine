-- AlterEnum
ALTER TYPE "MilestoneStatus" ADD VALUE 'IN_REVIEW';

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "approvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Update" ADD COLUMN     "approvedAt" TIMESTAMP(3);
