/*
  Warnings:

  - The values [EXPIRED] on the enum `Renting_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `credits` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `credittopup` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `transactionId` to the `Renting` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `credittopup` DROP FOREIGN KEY `CreditTopup_userId_fkey`;

-- AlterTable
ALTER TABLE `renting` ADD COLUMN `transactionId` INTEGER NOT NULL,
    MODIFY `status` ENUM('ACTIVE', 'DONE', 'OVERDUE') NOT NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `credits`;

-- DropTable
DROP TABLE `credittopup`;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionID` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `type` ENUM('TOPUP', 'RENT', 'WEEKLY') NOT NULL,
    `validatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Transaction_transactionID_key`(`transactionID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Renting` ADD CONSTRAINT `Renting_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
