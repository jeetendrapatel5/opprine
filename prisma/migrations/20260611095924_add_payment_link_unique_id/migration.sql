/*
  Warnings:

  - A unique constraint covering the columns `[projectId,number]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Invoice_projectId_number_key" ON "Invoice"("projectId", "number");
