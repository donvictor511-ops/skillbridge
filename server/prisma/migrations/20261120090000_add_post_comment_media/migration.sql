-- AlterTable
ALTER TABLE "post_comments" ADD COLUMN "image_url" VARCHAR(2048),
ADD COLUMN "video_url" VARCHAR(2048);

-- AlterTable
ALTER TABLE "posts" ADD COLUMN "video_url" VARCHAR(2048);