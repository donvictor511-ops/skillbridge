ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'community_invite';

ALTER TABLE "profiles"
  ADD COLUMN "spoken_languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "allow_community_invites" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "messages"
  ADD COLUMN "media_url" VARCHAR(2048),
  ADD COLUMN "media_type" VARCHAR(10),
  ADD COLUMN "edited_at" TIMESTAMP(3);

ALTER TABLE "community_posts"
  ADD COLUMN "media_url" VARCHAR(2048),
  ADD COLUMN "media_type" VARCHAR(10);

CREATE TYPE "community_invitation_status" AS ENUM ('pending', 'accepted', 'declined');
CREATE TABLE "community_invitations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "community_id" UUID NOT NULL,
  "inviter_id" UUID NOT NULL,
  "invitee_id" UUID NOT NULL,
  "status" "community_invitation_status" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "community_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_invitations_community_invitee_key" UNIQUE ("community_id", "invitee_id"),
  CONSTRAINT "community_invitations_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "community_invitations_invitee_id_status_created_at_idx" ON "community_invitations"("invitee_id", "status", "created_at");

CREATE TABLE "call_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "call_id" UUID NOT NULL,
  "sender_id" UUID NOT NULL,
  "content" VARCHAR(5000) NOT NULL DEFAULT '',
  "media_url" VARCHAR(2048),
  "media_type" VARCHAR(10),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "call_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "call_messages_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "call_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "call_messages_call_id_created_at_idx" ON "call_messages"("call_id", "created_at");
