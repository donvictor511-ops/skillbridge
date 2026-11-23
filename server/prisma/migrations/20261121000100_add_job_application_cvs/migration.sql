ALTER TABLE "job_applications"
ADD COLUMN "cv_public_id" VARCHAR(255),
ADD COLUMN "cv_format" VARCHAR(10),
ADD COLUMN "cv_file_name" VARCHAR(255);
