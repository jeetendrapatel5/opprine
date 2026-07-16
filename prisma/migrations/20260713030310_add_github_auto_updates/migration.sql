-- CreateEnum
CREATE TYPE "UpdateType" AS ENUM ('MANUAL', 'AUTO_DEPLOY');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "githubRepoName" TEXT,
ADD COLUMN     "githubRepoOwner" TEXT,
ADD COLUMN     "githubWebhookSecret" TEXT;

-- AlterTable
ALTER TABLE "Update" ADD COLUMN     "commitSha" TEXT,
ADD COLUMN     "commitUrl" TEXT,
ADD COLUMN     "previewUrl" TEXT,
ADD COLUMN     "type" "UpdateType" NOT NULL DEFAULT 'MANUAL';
