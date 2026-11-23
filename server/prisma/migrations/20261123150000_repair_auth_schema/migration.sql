-- Keep legacy names intact while allowing the current Prisma User model to
-- create users without a full_name value.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'full_name'
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "full_name" DROP NOT NULL;
  END IF;
END
$$;

-- Registration and login both create a server-side session. The table is
-- missing from the existing migration history even though Prisma models it.
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_hash_key"
  ON "sessions"("token_hash");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx"
  ON "sessions"("user_id");
