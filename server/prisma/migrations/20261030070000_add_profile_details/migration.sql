
-- CreateEnum
CREATE TYPE "profile_visibility" AS ENUM ('public', 'members', 'private');

-- CreateEnum
CREATE TYPE "business_size_range" AS ENUM ('1-10', '11-50', '51-200', '201-500', '501+');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "avatar_url" VARCHAR(2048),
ADD COLUMN "bio" VARCHAR(2000),
ADD COLUMN "cover_url" VARCHAR(2048),
ADD COLUMN "visibility" "profile_visibility" NOT NULL DEFAULT 'members';

-- CreateTable
CREATE TABLE "experiences" (
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
CREATE TABLE "education_entries" (
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
CREATE TABLE "portfolio_projects" (
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
CREATE TABLE "portfolio_project_skills" (
    "project_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    CONSTRAINT "portfolio_project_skills_pkey" PRIMARY KEY ("project_id","skill_id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
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
CREATE INDEX "experiences_profile_id_idx" ON "experiences"("profile_id");

-- CreateIndex
CREATE INDEX "education_entries_profile_id_idx" ON "education_entries"("profile_id");

-- CreateIndex
CREATE INDEX "portfolio_projects_profile_id_idx" ON "portfolio_projects"("profile_id");

-- CreateIndex
CREATE INDEX "portfolio_project_skills_skill_id_idx" ON "portfolio_project_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_user_id_key" ON "business_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_profile_id_fkey"
FOREIGN KEY ("profile_id") REFERENCES "profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_entries" ADD CONSTRAINT "education_entries_profile_id_fkey"
FOREIGN KEY ("profile_id") REFERENCES "profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_profile_id_fkey"
FOREIGN KEY ("profile_id") REFERENCES "profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_project_skills" ADD CONSTRAINT "portfolio_project_skills_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "portfolio_projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_project_skills" ADD CONSTRAINT "portfolio_project_skills_skill_id_fkey"
FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------
-- Extra safety rules Prisma cannot express.
-- ---------------------------------------------------------------

-- Experience end date cannot be before start date.
ALTER TABLE "experiences"
  ADD CONSTRAINT "experiences_dates_check"
  CHECK ("end_date" IS NULL OR "end_date" >= "start_date");

-- Education years must be within a sensible range.
ALTER TABLE "education_entries"
  ADD CONSTRAINT "education_year_range_check"
  CHECK (
    ("start_year" IS NULL OR "start_year" BETWEEN 1900 AND 2100)
    AND ("end_year" IS NULL OR "end_year" BETWEEN 1900 AND 2100)
  );

-- Education end year cannot be before start year.
ALTER TABLE "education_entries"
  ADD CONSTRAINT "education_year_order_check"
  CHECK ("start_year" IS NULL OR "end_year" IS NULL OR "end_year" >= "start_year");

-- URLs must use HTTP or HTTPS.
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_avatar_url_check"
  CHECK ("avatar_url" IS NULL OR "avatar_url" ~* '^https?://');

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_cover_url_check"
  CHECK ("cover_url" IS NULL OR "cover_url" ~* '^https?://');

ALTER TABLE "portfolio_projects"
  ADD CONSTRAINT "portfolio_projects_project_url_check"
  CHECK ("project_url" IS NULL OR "project_url" ~* '^https?://');

ALTER TABLE "portfolio_projects"
  ADD CONSTRAINT "portfolio_projects_image_url_check"
  CHECK ("image_url" IS NULL OR "image_url" ~* '^https?://');

ALTER TABLE "business_profiles"
  ADD CONSTRAINT "business_profiles_website_url_check"
  CHECK ("website_url" IS NULL OR "website_url" ~* '^https?://');
