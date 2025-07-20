/*
  Warnings:

  - You are about to drop the column `profileId` on the `FcmToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,deviceId]` on the table `FcmToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `FcmToken` table without a default value. This is not possible if the table is not empty.
  - Made the column `senderId` on table `Notification` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "FcmToken" DROP CONSTRAINT "FcmToken_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_senderId_fkey";

-- DropIndex
DROP INDEX "FcmToken_profileId_deviceId_key";

-- AlterTable
ALTER TABLE "FcmToken" DROP COLUMN "profileId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "senderId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_userId_deviceId_key" ON "FcmToken"("userId", "deviceId");

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
