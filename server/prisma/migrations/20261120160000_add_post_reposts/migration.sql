ALTER TABLE "posts"
ADD COLUMN "repost_of_id" UUID;

ALTER TABLE "posts"
ADD CONSTRAINT "posts_repost_of_id_fkey"
FOREIGN KEY ("repost_of_id") REFERENCES "posts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "posts_repost_of_id_idx" ON "posts"("repost_of_id");
CREATE UNIQUE INDEX "posts_author_id_repost_of_id_key"
ON "posts"("author_id", "repost_of_id");
