ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'moderation_report';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'account_appeal';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'account_appeal_update';

CREATE TYPE "account_appeal_status" AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE "account_appeals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "admin_action_id" UUID,
  "status" "account_appeal_status" NOT NULL DEFAULT 'pending',
  "message" VARCHAR(2000) NOT NULL,
  "resolution_note" VARCHAR(1000),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "resolved_by_id" UUID,
  CONSTRAINT "account_appeals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "account_appeals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "account_appeals_admin_action_id_fkey" FOREIGN KEY ("admin_action_id") REFERENCES "admin_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "account_appeals_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "account_appeals_status_created_at_idx" ON "account_appeals"("status", "created_at");
CREATE INDEX "account_appeals_user_id_created_at_idx" ON "account_appeals"("user_id", "created_at");
CREATE UNIQUE INDEX "account_appeals_user_id_admin_action_id_key" ON "account_appeals"("user_id", "admin_action_id");
