CREATE TYPE "auth_provider" AS ENUM ('google', 'linkedin');

CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "provider_subject" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_identities_provider_provider_subject_key"
ON "auth_identities"("provider", "provider_subject");

CREATE INDEX "auth_identities_user_id_idx"
ON "auth_identities"("user_id");

ALTER TABLE "auth_identities"
ADD CONSTRAINT "auth_identities_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
