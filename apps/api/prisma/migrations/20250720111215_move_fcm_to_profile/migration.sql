/*
  Warnings:

  - You are about to drop the column `userId` on the `FcmToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[profileId,deviceId]` on the table `FcmToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `profileId` to the `FcmToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FcmToken" DROP CONSTRAINT "FcmToken_userId_fkey";

-- DropIndex
DROP INDEX "FcmToken_userId_deviceId_key";

-- AlterTable
ALTER TABLE "FcmToken" DROP COLUMN "userId",
ADD COLUMN     "profileId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_profileId_deviceId_key" ON "FcmToken"("profileId", "deviceId");

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
