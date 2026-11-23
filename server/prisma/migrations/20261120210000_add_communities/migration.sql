ALTER TYPE "notification_type" ADD VALUE 'community_post';

CREATE TYPE "community_role" AS ENUM ('owner', 'moderator', 'member');
CREATE TYPE "community_report_status" AS ENUM ('pending', 'reviewed', 'dismissed');

CREATE TABLE "communities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "description" VARCHAR(600) NOT NULL,
  "guidelines" VARCHAR(5000) NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "communities_name_idx" ON "communities"("name");
CREATE INDEX "communities_owner_id_idx" ON "communities"("owner_id");

CREATE TABLE "community_members" (
  "community_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "community_role" NOT NULL DEFAULT 'member',
  "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_members_pkey" PRIMARY KEY ("community_id", "user_id"),
  CONSTRAINT "community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "community_members_user_id_joined_at_idx" ON "community_members"("user_id", "joined_at");

CREATE TABLE "community_posts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "community_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "content" VARCHAR(3000) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "community_posts_community_id_created_at_idx" ON "community_posts"("community_id", "created_at");
CREATE INDEX "community_posts_author_id_created_at_idx" ON "community_posts"("author_id", "created_at");

CREATE TABLE "community_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "community_id" UUID NOT NULL,
  "post_id" UUID,
  "reporter_id" UUID NOT NULL,
  "resolved_by_id" UUID,
  "reason" VARCHAR(40) NOT NULL,
  "details" VARCHAR(1000),
  "status" "community_report_status" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ,
  CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_reports_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "community_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "community_reports_community_id_status_created_at_idx" ON "community_reports"("community_id", "status", "created_at");
CREATE INDEX "community_reports_reporter_id_created_at_idx" ON "community_reports"("reporter_id", "created_at");

CREATE TABLE "community_comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "post_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "content" VARCHAR(2000) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "community_comments_post_id_created_at_idx" ON "community_comments"("post_id", "created_at");
CREATE INDEX "community_comments_author_id_created_at_idx" ON "community_comments"("author_id", "created_at");
