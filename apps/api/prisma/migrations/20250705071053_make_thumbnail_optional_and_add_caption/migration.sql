/*
  Warnings:

  - You are about to alter the column `caption` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.

*/
-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "caption" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "VideoPost" ALTER COLUMN "thumbnailUrl" DROP NOT NULL;
