-- AlterTable
ALTER TABLE `transaction` MODIFY `type` ENUM('TOPUP', 'RENT', 'WEEKLY', 'INITIAL') NOT NULL;
