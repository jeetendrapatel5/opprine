-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "lastViewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryChecklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dueDate" TIMESTAMP(3);
