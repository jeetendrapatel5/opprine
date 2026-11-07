-- CreateEnum
CREATE TYPE "ProjectActivityType" AS ENUM ('PROJECT_UPDATE_POSTED', 'GITHUB_PUSH', 'MILESTONE_CREATED', 'MILESTONE_SUBMITTED', 'MILESTONE_APPROVED', 'MILESTONE_CHANGES_REQUESTED', 'MILESTONE_COMPLETED', 'MILESTONE_UPDATE_POSTED', 'DELIVERABLE_UPLOADED', 'CLIENT_REQUEST_CREATED', 'CLIENT_REQUEST_SUBMITTED', 'CLIENT_REQUEST_ACCEPTED', 'CLIENT_REQUEST_CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityActorType" AS ENUM ('USER', 'CLIENT', 'SYSTEM', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "ActivityVisibility" AS ENUM ('INTERNAL', 'CLIENT');

-- CreateTable
CREATE TABLE "ProjectActivity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ProjectActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "actorType" "ActivityActorType" NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "visibility" "ActivityVisibility" NOT NULL DEFAULT 'INTERNAL',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT NOT NULL,

    CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectActivity_projectId_occurredAt_id_idx" ON "ProjectActivity"("projectId", "occurredAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectActivity_projectId_dedupeKey_key" ON "ProjectActivity"("projectId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
