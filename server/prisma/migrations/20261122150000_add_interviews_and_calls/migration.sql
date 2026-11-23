ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'interview_scheduled';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'interview_updated';

CREATE TYPE "call_kind" AS ENUM ('direct', 'community', 'interview');
CREATE TYPE "call_mode" AS ENUM ('audio', 'video');
CREATE TYPE "call_status" AS ENUM ('active', 'ended');
CREATE TYPE "call_participant_status" AS ENUM ('invited', 'joined', 'declined', 'left');
CREATE TYPE "interview_status" AS ENUM ('scheduled', 'cancelled', 'completed');

CREATE TABLE "interviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "application_id" UUID NOT NULL,
  "scheduled_by_id" UUID NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "duration_minutes" SMALLINT NOT NULL DEFAULT 30,
  "mode" "call_mode" NOT NULL DEFAULT 'video',
  "notes" VARCHAR(1000),
  "status" "interview_status" NOT NULL DEFAULT 'scheduled',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "interviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "interviews_application_id_key" UNIQUE ("application_id"),
  CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "interviews_scheduled_by_id_fkey" FOREIGN KEY ("scheduled_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "interviews_scheduled_at_status_idx" ON "interviews"("scheduled_at", "status");

CREATE TABLE "call_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" "call_kind" NOT NULL,
  "mode" "call_mode" NOT NULL,
  "status" "call_status" NOT NULL DEFAULT 'active',
  "created_by_id" UUID NOT NULL,
  "conversation_id" UUID,
  "community_id" UUID,
  "interview_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3),
  CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "call_sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "call_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "call_sessions_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "call_sessions_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "call_sessions_conversation_id_status_created_at_idx" ON "call_sessions"("conversation_id", "status", "created_at");
CREATE INDEX "call_sessions_community_id_status_created_at_idx" ON "call_sessions"("community_id", "status", "created_at");
CREATE INDEX "call_sessions_interview_id_status_created_at_idx" ON "call_sessions"("interview_id", "status", "created_at");

CREATE TABLE "call_participants" (
  "call_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "call_participant_status" NOT NULL DEFAULT 'invited',
  "joined_at" TIMESTAMP(3),
  "left_at" TIMESTAMP(3),
  CONSTRAINT "call_participants_pkey" PRIMARY KEY ("call_id", "user_id"),
  CONSTRAINT "call_participants_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "call_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "call_participants_user_id_status_idx" ON "call_participants"("user_id", "status");
