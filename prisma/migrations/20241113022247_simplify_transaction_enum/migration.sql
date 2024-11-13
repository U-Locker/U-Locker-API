/*
  Warnings:

  - The values [TOPUP,RENT,WEEKLY,INITIAL] on the enum `Transaction_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `transaction` MODIFY `type` ENUM('IN', 'OUT') NOT NULL;
