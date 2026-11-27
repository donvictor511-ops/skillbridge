CREATE TABLE "post_bookmarks" (
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_bookmarks_pkey" PRIMARY KEY ("post_id", "user_id"),
    CONSTRAINT "post_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "post_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "post_bookmarks_user_id_created_at_idx" ON "post_bookmarks"("user_id", "created_at");

CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "post_likes" BOOLEAN NOT NULL DEFAULT true,
    "comments" BOOLEAN NOT NULL DEFAULT true,
    "mentions" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "connections" BOOLEAN NOT NULL DEFAULT true,
    "groups" BOOLEAN NOT NULL DEFAULT true,
    "marketplace" BOOLEAN NOT NULL DEFAULT true,
    "platform_updates" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "notification_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(4096) NOT NULL,
    "label" VARCHAR(100) NOT NULL DEFAULT 'Browser',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_devices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "notification_devices_token_key" ON "notification_devices"("token");
CREATE INDEX "notification_devices_user_id_last_seen_at_idx" ON "notification_devices"("user_id", "last_seen_at");

CREATE FUNCTION notify_skillbridge_notification_created() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_notify('skillbridge_notification', json_build_object(
        'notificationId', NEW."id",
        'recipientId', NEW."recipient_id"
    )::text);
    RETURN NEW;
END;
$$;

CREATE TRIGGER "notifications_realtime_insert"
AFTER INSERT ON "notifications"
FOR EACH ROW EXECUTE FUNCTION notify_skillbridge_notification_created();
