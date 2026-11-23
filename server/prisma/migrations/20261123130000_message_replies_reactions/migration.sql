ALTER TABLE "messages"
  ADD COLUMN "reply_to_id" UUID;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_reply_to_id_fkey"
  FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "message_reactions" (
  "message_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "emoji" VARCHAR(16) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("message_id", "user_id", "emoji"),
  CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");
