-- AlterTable
ALTER TABLE `renting` MODIFY `status` ENUM('ACTIVE', 'EXPIRED', 'OVERDUE') NOT NULL;
