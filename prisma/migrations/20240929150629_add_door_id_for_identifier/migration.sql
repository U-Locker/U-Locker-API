/*
  Warnings:

  - Added the required column `doorId` to the `Rooms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `rooms` ADD COLUMN `doorId` INTEGER NOT NULL;
