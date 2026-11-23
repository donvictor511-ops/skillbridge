CREATE TYPE "user_role" AS ENUM ('member', 'admin');
CREATE TYPE "post_report_status" AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');

ALTER TYPE "community_report_status" ADD VALUE IF NOT EXISTS 'actioned';

ALTER TABLE "users"
  ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'member',
  ADD COLUMN "suspended_at" TIMESTAMP(3),
  ADD COLUMN "suspension_reason" VARCHAR(1000),
  ADD COLUMN "restricted_until" TIMESTAMP(3),
  ADD COLUMN "restriction_reason" VARCHAR(1000);

ALTER TABLE "user_reports"
  ADD COLUMN "status" "community_report_status" NOT NULL DEFAULT 'pending',
  ADD COLUMN "resolved_at" TIMESTAMP(3),
  ADD COLUMN "resolved_by_id" UUID;

ALTER TABLE "user_reports"
  ADD CONSTRAINT "user_reports_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "community_reports" ADD COLUMN "comment_id" UUID;
ALTER TABLE "community_reports" ADD COLUMN "content_snapshot" VARCHAR(3000);
ALTER TABLE "community_reports"
  ADD CONSTRAINT "community_reports_comment_id_fkey"
  FOREIGN KEY ("comment_id") REFERENCES "community_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "post_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reporter_id" UUID NOT NULL,
  "reported_user_id" UUID NOT NULL,
  "post_id" UUID,
  "comment_id" UUID,
  "reason" VARCHAR(40) NOT NULL,
  "details" VARCHAR(1000),
  "content_snapshot" VARCHAR(3000) NOT NULL,
  "status" "post_report_status" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "resolved_by_id" UUID,
  CONSTRAINT "post_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "post_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "post_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "post_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "post_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "post_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "post_reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "post_reports_one_target_check" CHECK (("post_id" IS NOT NULL AND "comment_id" IS NULL) OR ("post_id" IS NULL AND "comment_id" IS NOT NULL))
);

CREATE INDEX "post_reports_status_created_at_idx" ON "post_reports"("status", "created_at");
CREATE INDEX "post_reports_reported_user_id_created_at_idx" ON "post_reports"("reported_user_id", "created_at");
CREATE INDEX "post_reports_reporter_id_created_at_idx" ON "post_reports"("reporter_id", "created_at");

CREATE TABLE "admin_actions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_id" UUID,
  "target_user_id" UUID,
  "target_type" VARCHAR(40) NOT NULL,
  "target_id" UUID,
  "action" VARCHAR(40) NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "admin_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "admin_actions_created_at_idx" ON "admin_actions"("created_at");
CREATE INDEX "admin_actions_target_user_id_created_at_idx" ON "admin_actions"("target_user_id", "created_at");
