/*
  Warnings:

  - You are about to drop the `AdminNotification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `coupons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `document_submissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `locations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sms_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "users" RENAME CONSTRAINT "users_new_pkey1" TO "users_pkey",
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- DropTable
DROP TABLE "AdminNotification";

-- DropTable
DROP TABLE "coupons";

-- DropTable
DROP TABLE "document_submissions";

-- DropTable
DROP TABLE "email_logs";

-- DropTable
DROP TABLE "locations";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "profiles";

-- DropTable
DROP TABLE "reviews";

-- DropTable
DROP TABLE "settings";

-- DropTable
DROP TABLE "sms_logs";
