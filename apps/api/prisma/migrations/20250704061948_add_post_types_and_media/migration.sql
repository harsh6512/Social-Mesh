/*
  Warnings:

  - You are about to drop the column `mediaUrl` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "mediaUrl",
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ImagePost" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "postId" INTEGER NOT NULL,

    CONSTRAINT "ImagePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoPost" (
    "id" SERIAL NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,

    CONSTRAINT "VideoPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TweetPost" (
    "id" SERIAL NOT NULL,
    "mediaUrl" TEXT,
    "postId" INTEGER NOT NULL,

    CONSTRAINT "TweetPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImagePost_postId_key" ON "ImagePost"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoPost_postId_key" ON "VideoPost"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "TweetPost_postId_key" ON "TweetPost"("postId");

-- AddForeignKey
ALTER TABLE "ImagePost" ADD CONSTRAINT "ImagePost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoPost" ADD CONSTRAINT "VideoPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TweetPost" ADD CONSTRAINT "TweetPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VideoPost"
ADD CONSTRAINT "duration_max_5min" CHECK ("duration" <= 300);