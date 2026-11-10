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
