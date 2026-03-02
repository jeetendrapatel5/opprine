/*
  Warnings:

  - You are about to drop the column `note` on the `File` table. All the data in the column will be lost.
  - Added the required column `fileType` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "note",
ADD COLUMN     "fileType" TEXT NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL;
