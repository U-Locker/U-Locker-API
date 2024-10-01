/*
  Warnings:

  - You are about to drop the column `uid` on the `nfcqueue` table. All the data in the column will be lost.
  - Added the required column `ktmId` to the `NFCQueue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `machineId` to the `NFCQueue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `nfcqueue` DROP COLUMN `uid`,
    ADD COLUMN `ktmId` VARCHAR(191) NOT NULL,
    ADD COLUMN `machineId` VARCHAR(191) NOT NULL;
