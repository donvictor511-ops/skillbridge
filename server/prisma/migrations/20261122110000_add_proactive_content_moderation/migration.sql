ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'content_moderation_update';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'content_moderation_case';

CREATE TYPE "content_review_status" AS ENUM ('published', 'pending_review');
CREATE TYPE "moderation_case_status" AS ENUM ('pending', 'approved', 'removed');
CREATE TYPE "moderated_content_type" AS ENUM ('post', 'comment', 'community_post', 'community_comment');

ALTER TABLE "posts" ADD COLUMN "moderation_status" "content_review_status" NOT NULL DEFAULT 'published';
ALTER TABLE "post_comments" ADD COLUMN "moderation_status" "content_review_status" NOT NULL DEFAULT 'published';
ALTER TABLE "community_posts" ADD COLUMN "moderation_status" "content_review_status" NOT NULL DEFAULT 'published';
ALTER TABLE "community_comments" ADD COLUMN "moderation_status" "content_review_status" NOT NULL DEFAULT 'published';

CREATE TABLE "moderation_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "content_type" "moderated_content_type" NOT NULL,
  "content_id" UUID NOT NULL,
  "author_id" UUID,
  "content_snapshot" VARCHAR(3000) NOT NULL,
  "category" VARCHAR(60) NOT NULL,
  "explanation" VARCHAR(500) NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "community_name" VARCHAR(80),
  "status" "moderation_case_status" NOT NULL DEFAULT 'pending',
  "decision_note" VARCHAR(1000),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "resolved_by_id" UUID,
  CONSTRAINT "moderation_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moderation_cases_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "moderation_cases_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "moderation_cases_status_created_at_idx" ON "moderation_cases"("status", "created_at");
CREATE INDEX "moderation_cases_author_id_created_at_idx" ON "moderation_cases"("author_id", "created_at");
CREATE INDEX "moderation_cases_content_type_content_id_idx" ON "moderation_cases"("content_type", "content_id");
