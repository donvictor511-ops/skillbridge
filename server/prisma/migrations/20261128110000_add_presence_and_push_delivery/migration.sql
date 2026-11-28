CREATE TABLE "presence_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "presence_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "presence_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "presence_sessions_user_id_last_seen_at_idx" ON "presence_sessions"("user_id", "last_seen_at");
CREATE INDEX "presence_sessions_last_seen_at_idx" ON "presence_sessions"("last_seen_at");

CREATE TABLE "notification_push_deliveries" (
    "notification_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "retry_at" TIMESTAMP(3),
    "lease_until" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "last_error" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_push_deliveries_pkey" PRIMARY KEY ("notification_id"),
    CONSTRAINT "notification_push_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notification_push_deliveries_status_check" CHECK ("status" IN ('pending', 'processing', 'retry', 'sent', 'skipped'))
);
CREATE INDEX "notification_push_deliveries_work_idx" ON "notification_push_deliveries"("status", "retry_at", "lease_until", "created_at");

-- Existing registration tokens cannot be encrypted without the owner's new
-- server-side encryption key. Remove them so browsers can register securely.
DELETE FROM "notification_devices";
DROP INDEX "notification_devices_token_key";
ALTER TABLE "notification_devices" DROP COLUMN "token";
ALTER TABLE "notification_devices" ADD COLUMN "token_hash" CHAR(64) NOT NULL;
ALTER TABLE "notification_devices" ADD COLUMN "encrypted_token" TEXT NOT NULL;
CREATE UNIQUE INDEX "notification_devices_token_hash_key" ON "notification_devices"("token_hash");

CREATE OR REPLACE FUNCTION notify_skillbridge_notification_created() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "notification_push_deliveries" ("notification_id", "recipient_id")
    VALUES (NEW."id", NEW."recipient_id")
    ON CONFLICT ("notification_id") DO NOTHING;

    PERFORM pg_notify('skillbridge_notification', json_build_object(
        'notificationId', NEW."id",
        'recipientId', NEW."recipient_id"
    )::text);
    RETURN NEW;
END;
$$;
