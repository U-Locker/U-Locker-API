/*
  Warnings:

  - You are about to drop the column `ktmId` on the `nfcqueue` table. All the data in the column will be lost.
  - Added the required column `ktmUid` to the `NFCQueue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `nfcqueue` DROP COLUMN `ktmId`,
    ADD COLUMN `ktmUid` VARCHAR(191) NOT NULL;
