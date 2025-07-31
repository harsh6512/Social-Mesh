/*
  Warnings:

  - You are about to drop the `ImagePost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TweetPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VideoPost` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ImagePost" DROP CONSTRAINT "ImagePost_postId_fkey";

-- DropForeignKey
ALTER TABLE "TweetPost" DROP CONSTRAINT "TweetPost_postId_fkey";

-- DropForeignKey
ALTER TABLE "VideoPost" DROP CONSTRAINT "VideoPost_postId_fkey";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT;

-- DropTable
DROP TABLE "ImagePost";

-- DropTable
DROP TABLE "TweetPost";

-- DropTable
DROP TABLE "VideoPost";
