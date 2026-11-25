CREATE TABLE "follows" (
    "follower_id" UUID NOT NULL,
    "followed_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "followed_id"),
    CONSTRAINT "follows_no_self_follow_check" CHECK ("follower_id" <> "followed_id")
);

CREATE INDEX "follows_followed_id_created_at_idx"
ON "follows"("followed_id", "created_at");

CREATE INDEX "follows_follower_id_created_at_idx"
ON "follows"("follower_id", "created_at");

ALTER TABLE "follows"
ADD CONSTRAINT "follows_follower_id_fkey"
FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "follows"
ADD CONSTRAINT "follows_followed_id_fkey"
FOREIGN KEY ("followed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
