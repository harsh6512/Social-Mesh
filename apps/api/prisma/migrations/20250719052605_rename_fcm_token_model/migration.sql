/*
  Warnings:

  - You are about to drop the `Fcm_Token` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Fcm_Token" DROP CONSTRAINT "Fcm_Token_userId_fkey";

-- DropTable
DROP TABLE "Fcm_Token";

-- CreateTable
CREATE TABLE "FcmToken" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "deviceId" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_deviceId_key" ON "FcmToken"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_userId_deviceId_key" ON "FcmToken"("userId", "deviceId");

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
