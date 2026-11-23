CREATE TYPE "post_reaction_type" AS ENUM ('like', 'love', 'celebrate', 'support', 'insightful');

ALTER TABLE "post_likes"
  ADD COLUMN "reaction_type" "post_reaction_type" NOT NULL DEFAULT 'like';

ALTER TABLE "post_comments"
  ADD COLUMN "parent_comment_id" UUID;

CREATE INDEX "post_comments_parent_comment_id_created_at_idx"
  ON "post_comments"("parent_comment_id", "created_at");

ALTER TABLE "post_comments"
  ADD CONSTRAINT "post_comments_parent_comment_id_fkey"
  FOREIGN KEY ("parent_comment_id") REFERENCES "post_comments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
