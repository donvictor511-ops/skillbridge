ALTER TYPE "notification_type" ADD VALUE 'job_application';
ALTER TYPE "notification_type" ADD VALUE 'job_application_update';
ALTER TYPE "notification_type" ADD VALUE 'project_proposal';
ALTER TYPE "notification_type" ADD VALUE 'project_proposal_update';

CREATE TYPE "job_listing_status" AS ENUM ('open', 'closed');
CREATE TYPE "application_status" AS ENUM ('submitted', 'reviewing', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE "project_listing_status" AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "proposal_status" AS ENUM ('submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn');

CREATE TABLE "job_listings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "description" VARCHAR(8000) NOT NULL,
  "category" VARCHAR(60) NOT NULL,
  "employment_type" VARCHAR(30) NOT NULL,
  "location" VARCHAR(120),
  "is_remote" BOOLEAN NOT NULL DEFAULT true,
  "budget_min" DECIMAL(12,2),
  "budget_max" DECIMAL(12,2),
  "currency" CHAR(3) NOT NULL DEFAULT 'USD',
  "status" "job_listing_status" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_listings_budget_range_check" CHECK ("budget_min" IS NULL OR "budget_max" IS NULL OR "budget_min" <= "budget_max"),
  CONSTRAINT "job_listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "job_listings_status_category_created_at_idx" ON "job_listings"("status", "category", "created_at");
CREATE INDEX "job_listings_owner_id_created_at_idx" ON "job_listings"("owner_id", "created_at");

CREATE TABLE "job_applications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_id" UUID NOT NULL,
  "applicant_id" UUID NOT NULL,
  "cover_letter" VARCHAR(5000) NOT NULL,
  "status" "application_status" NOT NULL DEFAULT 'submitted',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_applications_job_id_applicant_id_key" UNIQUE ("job_id", "applicant_id"),
  CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "job_applications_applicant_id_status_created_at_idx" ON "job_applications"("applicant_id", "status", "created_at");
CREATE INDEX "job_applications_job_id_status_created_at_idx" ON "job_applications"("job_id", "status", "created_at");

CREATE TABLE "project_listings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "description" VARCHAR(8000) NOT NULL,
  "category" VARCHAR(60) NOT NULL,
  "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "budget" DECIMAL(12,2),
  "currency" CHAR(3) NOT NULL DEFAULT 'USD',
  "delivery_time" VARCHAR(100),
  "status" "project_listing_status" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_listings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "project_listings_status_category_created_at_idx" ON "project_listings"("status", "category", "created_at");
CREATE INDEX "project_listings_owner_id_created_at_idx" ON "project_listings"("owner_id", "created_at");

CREATE TABLE "project_proposals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "cover_letter" VARCHAR(5000) NOT NULL,
  "proposed_budget" DECIMAL(12,2),
  "delivery_time" VARCHAR(100),
  "status" "proposal_status" NOT NULL DEFAULT 'submitted',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_proposals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_proposals_project_id_author_id_key" UNIQUE ("project_id", "author_id"),
  CONSTRAINT "project_proposals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_proposals_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "project_proposals_author_id_status_created_at_idx" ON "project_proposals"("author_id", "status", "created_at");
CREATE INDEX "project_proposals_project_id_status_created_at_idx" ON "project_proposals"("project_id", "status", "created_at");
