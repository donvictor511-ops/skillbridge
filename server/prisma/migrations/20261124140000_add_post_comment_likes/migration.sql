CREATE TABLE "post_comment_likes" (
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comment_likes_pkey" PRIMARY KEY ("comment_id", "user_id")
);

CREATE INDEX "post_comment_likes_user_id_idx" ON "post_comment_likes"("user_id");

ALTER TABLE "post_comment_likes"
  ADD CONSTRAINT "post_comment_likes_comment_id_fkey"
  FOREIGN KEY ("comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_comment_likes"
  ADD CONSTRAINT "post_comment_likes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
