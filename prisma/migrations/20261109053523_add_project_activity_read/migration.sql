-- CreateTable
CREATE TABLE "ProjectActivityRead" (
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectActivityRead_pkey" PRIMARY KEY ("userId","projectId")
);

-- CreateIndex
CREATE INDEX "ProjectActivityRead_projectId_idx" ON "ProjectActivityRead"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectActivityRead" ADD CONSTRAINT "ProjectActivityRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectActivityRead" ADD CONSTRAINT "ProjectActivityRead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
