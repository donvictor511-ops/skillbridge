export const VISIBILITIES = ["public", "members", "private"] as const;
export type ProfileVisibility = (typeof VISIBILITIES)[number];

export const MAX_DISPLAY_NAME = 80;
export const MAX_HEADLINE = 120;
export const MAX_LOCATION = 80;
export const MAX_BIO = 2000;
export const MAX_URL_LENGTH = 2048;

// Experience and education sections
export const MAX_EXPERIENCES = 20;
export const MAX_EDUCATION_ENTRIES = 10;
export const MAX_JOB_TITLE = 100;
export const MAX_COMPANY = 100;
export const MAX_SECTION_LOCATION = 100;
export const MAX_EXPERIENCE_DESCRIPTION = 2000;
export const MAX_SCHOOL = 120;
export const MAX_DEGREE = 100;
export const MAX_FIELD_OF_STUDY = 100;
export const MAX_EDUCATION_DESCRIPTION = 1000;
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

// Portfolio projects
export const MAX_PROJECTS = 20;
export const MAX_PROJECT_SKILLS = 10;
export const MAX_PROJECT_TITLE = 100;
export const MAX_PROJECT_DESCRIPTION = 2000;

// Company details (client or business accounts)
export const MAX_COMPANY_NAME = 120;
export const MAX_INDUSTRY = 100;
export const MAX_COMPANY_ABOUT = 2000;
export const COMPANY_SIZE_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501+",
] as const;
