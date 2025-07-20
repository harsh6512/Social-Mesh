/*
  Warnings:

  - The values [Omegle] on the enum `IntentionType` will be removed. If these variants are still used in the database, this will fail.
  - The values [Omegle] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IntentionType_new" AS ENUM ('Friendship', 'Dating', 'Networking', 'Open', 'Quick_Connect', 'Unspecified');
ALTER TABLE "Follow" ALTER COLUMN "intention" TYPE "IntentionType_new" USING ("intention"::text::"IntentionType_new");
ALTER TYPE "IntentionType" RENAME TO "IntentionType_old";
ALTER TYPE "IntentionType_new" RENAME TO "IntentionType";
DROP TYPE "IntentionType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('Follow', 'Like', 'Comment', 'Quick_Connect', 'Direct_Message');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "FcmToken" DROP CONSTRAINT "FcmToken_userId_fkey";

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
