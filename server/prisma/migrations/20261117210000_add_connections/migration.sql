-- Create the connection status enum.
CREATE TYPE "connection_status" AS ENUM (
    'pending',
    'accepted',
    'rejected'
);

-- Create the connections table.
CREATE TABLE "connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_low_id" UUID NOT NULL,
    "user_high_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "status" "connection_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id"),

    CONSTRAINT "connections_user_pair_order_check"
        CHECK ("user_low_id" < "user_high_id"),

    CONSTRAINT "connections_requester_in_pair_check"
        CHECK (
            "requested_by_id" = "user_low_id"
            OR "requested_by_id" = "user_high_id"
        )
);

-- Prevent duplicate connections between the same two users.
CREATE UNIQUE INDEX "connections_user_low_id_user_high_id_key"
ON "connections"("user_low_id", "user_high_id");

-- Support connection lookups by participant and status.
CREATE INDEX "connections_user_low_id_status_idx"
ON "connections"("user_low_id", "status");

CREATE INDEX "connections_user_high_id_status_idx"
ON "connections"("user_high_id", "status");

CREATE INDEX "connections_requested_by_id_idx"
ON "connections"("requested_by_id");

-- Keep connections linked to existing users.
ALTER TABLE "connections"
ADD CONSTRAINT "connections_user_low_id_fkey"
FOREIGN KEY ("user_low_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "connections"
ADD CONSTRAINT "connections_user_high_id_fkey"
FOREIGN KEY ("user_high_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "connections"
ADD CONSTRAINT "connections_requested_by_id_fkey"
FOREIGN KEY ("requested_by_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;