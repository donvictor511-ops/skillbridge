ALTER TABLE "messages"
ADD COLUMN "deleted_for_low_at" TIMESTAMP(3),
ADD COLUMN "deleted_for_high_at" TIMESTAMP(3);
