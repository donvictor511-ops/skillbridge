CREATE TABLE "user_blocks" (
  "blocker_id" UUID NOT NULL,
  "blocked_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id"),
  CONSTRAINT "user_blocks_no_self_block" CHECK ("blocker_id" <> "blocked_id"),
  CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");

CREATE TABLE "user_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reporter_id" UUID NOT NULL,
  "reported_user_id" UUID NOT NULL,
  "reason" VARCHAR(40) NOT NULL,
  "details" VARCHAR(1000),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_reports_no_self_report" CHECK ("reporter_id" <> "reported_user_id"),
  CONSTRAINT "user_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "user_reports_reported_user_id_created_at_idx" ON "user_reports"("reported_user_id", "created_at");
CREATE INDEX "user_reports_reporter_id_created_at_idx" ON "user_reports"("reporter_id", "created_at");
