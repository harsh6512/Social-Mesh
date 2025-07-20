/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `FcmToken` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_token_key" ON "FcmToken"("token");
