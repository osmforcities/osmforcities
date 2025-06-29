/*
  Warnings:

  - You are about to drop the column `lastNotified` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "lastNotified",
ADD COLUMN     "lastReportSent" TIMESTAMP(3),
ADD COLUMN     "reportsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportsFrequency" "ReportFrequency" NOT NULL DEFAULT 'DAILY';
