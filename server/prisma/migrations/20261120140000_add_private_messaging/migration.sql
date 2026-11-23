ALTER TYPE "notification_type" ADD VALUE 'message';

CREATE TABLE "conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_low_id" UUID NOT NULL,
  "user_high_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversations_user_low_id_fkey"
    FOREIGN KEY ("user_low_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversations_user_high_id_fkey"
    FOREIGN KEY ("user_high_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversations_user_pair_order_check" CHECK ("user_low_id" < "user_high_id")
);
CREATE UNIQUE INDEX "conversations_user_low_id_user_high_id_key"
  ON "conversations"("user_low_id", "user_high_id");
CREATE INDEX "conversations_user_low_id_updated_at_idx"
  ON "conversations"("user_low_id", "updated_at");
CREATE INDEX "conversations_user_high_id_updated_at_idx"
  ON "conversations"("user_high_id", "updated_at");

CREATE TABLE "conversation_participants" (
  "conversation_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_read_at" TIMESTAMP(3),
  "archived_at" TIMESTAMP(3),
  CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id"),
  CONSTRAINT "conversation_participants_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversation_participants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "conversation_participants_user_id_archived_at_idx"
  ON "conversation_participants"("user_id", "archived_at");

CREATE TABLE "messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL,
  "sender_id" UUID NOT NULL,
  "content" VARCHAR(5000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "messages_conversation_id_created_at_id_idx"
  ON "messages"("conversation_id", "created_at", "id");
CREATE INDEX "messages_sender_id_created_at_idx"
  ON "messages"("sender_id", "created_at");
