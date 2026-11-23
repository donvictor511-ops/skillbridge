-- Restore onboarding tables omitted from the original create_users migration.
-- The profile-details migration was partially applied on Neon (its enum types
-- exist, but it failed before creating the profiles table), so keep this repair
-- safe to run against that partial state and databases where onboarding exists.
DO $$ BEGIN
  CREATE TYPE "account_type" AS ENUM ('professional', 'client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "profile_visibility" AS ENUM ('public', 'members', 'private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "business_size_range" AS ENUM ('1-10', '11-50', '51-200', '201-500', '501+');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "capabilities" "account_type"[] NOT NULL DEFAULT ARRAY[]::"account_type"[],
  ADD COLUMN IF NOT EXISTS "onboarded_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "display_name" TEXT NOT NULL,
  "headline" TEXT,
  "location" TEXT,
  "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_user_id_key" ON "profiles"("user_id");

CREATE TABLE IF NOT EXISTS "skills" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "name_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "skills_name_key_key" ON "skills"("name_key");

CREATE TABLE IF NOT EXISTS "user_skills" (
  "user_id" UUID NOT NULL,
  "skill_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_skills_pkey" PRIMARY KEY ("user_id", "skill_id"),
  CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "user_skills_skill_id_idx" ON "user_skills"("skill_id");

-- Apply the original profile-details migration body after restoring its base
-- schema, with guards so already-provisioned databases safely no-op.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR(2048),
ADD COLUMN IF NOT EXISTS "bio" VARCHAR(2000),
ADD COLUMN IF NOT EXISTS "cover_url" VARCHAR(2048),
ADD COLUMN IF NOT EXISTS "visibility" "profile_visibility" NOT NULL DEFAULT 'members';

-- CreateTable
CREATE TABLE IF NOT EXISTS "experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "company" VARCHAR(100) NOT NULL,
    "location" VARCHAR(100),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "description" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "education_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "school" VARCHAR(120) NOT NULL,
    "degree" VARCHAR(100),
    "field_of_study" VARCHAR(100),
    "start_year" SMALLINT,
    "end_year" SMALLINT,
    "description" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "education_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "portfolio_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "project_url" VARCHAR(2048),
    "image_url" VARCHAR(2048),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "portfolio_project_skills" (
    "project_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    CONSTRAINT "portfolio_project_skills_pkey" PRIMARY KEY ("project_id","skill_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "business_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_name" VARCHAR(120) NOT NULL,
    "website_url" VARCHAR(2048),
    "industry" VARCHAR(100),
    "size_range" "business_size_range",
    "about" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "experiences_profile_id_idx" ON "experiences"("profile_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "education_entries_profile_id_idx" ON "education_entries"("profile_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "portfolio_projects_profile_id_idx" ON "portfolio_projects"("profile_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "portfolio_project_skills_skill_id_idx" ON "portfolio_project_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "business_profiles_user_id_key" ON "business_profiles"("user_id");

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'experiences_profile_id_fkey' AND conrelid = 'public.experiences'::regclass) THEN
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_profile_id_fkey"
FOREIGN KEY ("profile_id") REFERENCES "profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'education_entries_profile_id_fkey' AND conrelid = 'public.education_entries'::regclass) THEN
ALTER TABLE "education_entries" ADD CONSTRAINT "education_entries_profile_id_fkey"
FOREIGN KEY ("profile_id") REFERENCES "profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_projects_profile_id_fkey' AND conrelid = 'public.portfolio_projects'::regclass) THEN
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_profile_id_fkey"
FOREIGN KEY ("profile_id") REFERENCES "profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_project_skills_project_id_fkey' AND conrelid = 'public.portfolio_project_skills'::regclass) THEN
ALTER TABLE "portfolio_project_skills" ADD CONSTRAINT "portfolio_project_skills_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "portfolio_projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_project_skills_skill_id_fkey' AND conrelid = 'public.portfolio_project_skills'::regclass) THEN
ALTER TABLE "portfolio_project_skills" ADD CONSTRAINT "portfolio_project_skills_skill_id_fkey"
FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_profiles_user_id_fkey' AND conrelid = 'public.business_profiles'::regclass) THEN
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- ---------------------------------------------------------------
-- Extra safety rules Prisma cannot express.
-- ---------------------------------------------------------------

-- Experience end date cannot be before start date.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'experiences_dates_check' AND conrelid = 'public.experiences'::regclass) THEN
ALTER TABLE "experiences"
  ADD CONSTRAINT "experiences_dates_check"
  CHECK ("end_date" IS NULL OR "end_date" >= "start_date");
END IF; END $$;

-- Education years must be within a sensible range.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'education_year_range_check' AND conrelid = 'public.education_entries'::regclass) THEN
ALTER TABLE "education_entries"
  ADD CONSTRAINT "education_year_range_check"
  CHECK (
    ("start_year" IS NULL OR "start_year" BETWEEN 1900 AND 2100)
    AND ("end_year" IS NULL OR "end_year" BETWEEN 1900 AND 2100)
  );
END IF; END $$;

-- Education end year cannot be before start year.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'education_year_order_check' AND conrelid = 'public.education_entries'::regclass) THEN
ALTER TABLE "education_entries"
  ADD CONSTRAINT "education_year_order_check"
  CHECK ("start_year" IS NULL OR "end_year" IS NULL OR "end_year" >= "start_year");
END IF; END $$;

-- URLs must use HTTP or HTTPS.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_avatar_url_check' AND conrelid = 'public.profiles'::regclass) THEN
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_avatar_url_check"
  CHECK ("avatar_url" IS NULL OR "avatar_url" ~* '^https?://');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_cover_url_check' AND conrelid = 'public.profiles'::regclass) THEN
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_cover_url_check"
  CHECK ("cover_url" IS NULL OR "cover_url" ~* '^https?://');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_projects_project_url_check' AND conrelid = 'public.portfolio_projects'::regclass) THEN
ALTER TABLE "portfolio_projects"
  ADD CONSTRAINT "portfolio_projects_project_url_check"
  CHECK ("project_url" IS NULL OR "project_url" ~* '^https?://');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_projects_image_url_check' AND conrelid = 'public.portfolio_projects'::regclass) THEN
ALTER TABLE "portfolio_projects"
  ADD CONSTRAINT "portfolio_projects_image_url_check"
  CHECK ("image_url" IS NULL OR "image_url" ~* '^https?://');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_profiles_website_url_check' AND conrelid = 'public.business_profiles'::regclass) THEN
ALTER TABLE "business_profiles"
  ADD CONSTRAINT "business_profiles_website_url_check"
  CHECK ("website_url" IS NULL OR "website_url" ~* '^https?://');
END IF; END $$;
