// What we send when saving projects and company details. They match the API.

export interface ProjectInput {
  title: string;
  description: string;
  projectUrl: string | null;
  imageUrl: string | null;
  // Ids of skills that are on YOUR profile.
  skillIds: string[];
}

export interface BusinessInput {
  companyName: string;
  websiteUrl: string | null;
  industry: string | null;
  // "1-10", "11-50", "51-200", "201-500", or "501+"
  sizeRange: string | null;
  about: string | null;
}
