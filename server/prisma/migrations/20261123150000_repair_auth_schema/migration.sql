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

-- Registration and login both create a server-side session. Create the table
-- and its indexes only when absent. A pre-existing sessions table can belong
-- to another database role, so migration must not try to alter or re-index it.
DO $$
BEGIN
  IF to_regclass('public.sessions') IS NULL THEN
    CREATE TABLE "sessions" (
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

    CREATE UNIQUE INDEX "sessions_token_hash_key"
      ON "sessions"("token_hash");
    CREATE INDEX "sessions_user_id_idx"
      ON "sessions"("user_id");
  END IF;
END
$$;