-- CreateTable
CREATE TABLE "Fcm_Token" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "deviceId" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fcm_Token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fcm_Token_deviceId_key" ON "Fcm_Token"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Fcm_Token_userId_deviceId_key" ON "Fcm_Token"("userId", "deviceId");

-- AddForeignKey
ALTER TABLE "Fcm_Token" ADD CONSTRAINT "Fcm_Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
