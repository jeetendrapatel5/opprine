/*
  Warnings:

  - You are about to drop the column `caseStudyCoverImage` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `caseStudyEnabled` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `caseStudyHideClient` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `caseStudyIndustry` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `caseStudyOutcome` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `caseStudyProblem` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `caseStudyTechStack` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `profileEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profileTagline` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_projectId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Inquiry" DROP CONSTRAINT "Inquiry_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Update" DROP CONSTRAINT "Update_projectId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "User_username_key";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN IF EXISTS "caseStudyCoverImage",
DROP COLUMN IF EXISTS "caseStudyEnabled",
DROP COLUMN IF EXISTS "caseStudyHideClient",
DROP COLUMN IF EXISTS "caseStudyIndustry",
DROP COLUMN IF EXISTS "caseStudyOutcome",
DROP COLUMN IF EXISTS "caseStudyProblem",
DROP COLUMN IF EXISTS "caseStudyTechStack";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "profileEnabled",
DROP COLUMN IF EXISTS "profileTagline",
DROP COLUMN IF EXISTS "username";

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Update" ADD CONSTRAINT "Update_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
