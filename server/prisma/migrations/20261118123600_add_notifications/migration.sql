-- Create notification type enum
CREATE TYPE "notification_type" AS ENUM (
  'connection_request',
  'connection_accepted'
);

-- Create notifications table
CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "recipient_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "type" "notification_type" NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "resource_id" UUID,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "notifications_recipient_id_fkey"
    FOREIGN KEY ("recipient_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "notifications_actor_id_fkey"
    FOREIGN KEY ("actor_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX "notifications_recipient_id_created_at_idx"
  ON "notifications"("recipient_id", "created_at");

CREATE INDEX "notifications_recipient_id_is_read_idx"
  ON "notifications"("recipient_id", "is_read");