-- AlterEnum
ALTER TYPE "RequestType" ADD VALUE 'FILE';

-- AlterTable
ALTER TABLE "ClientRequest" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "filePublicId" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "fileUrl" TEXT;
