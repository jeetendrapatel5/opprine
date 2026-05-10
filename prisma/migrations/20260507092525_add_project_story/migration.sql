/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "caseStudyCoverImage" TEXT,
ADD COLUMN     "caseStudyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "caseStudyHideClient" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "caseStudyIndustry" TEXT,
ADD COLUMN     "caseStudyOutcome" TEXT,
ADD COLUMN     "caseStudyProblem" TEXT,
ADD COLUMN     "caseStudyTechStack" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileTagline" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
