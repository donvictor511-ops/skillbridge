-- Prisma expects the database to generate User IDs.
ALTER TABLE "users"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
