/*
  Warnings:

  - Added the required column `protocol` to the `ForwardRule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ForwardRule" ADD COLUMN     "protocol" TEXT NOT NULL;
