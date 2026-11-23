export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  posts: "/posts",
  discover: "/discover",
  search: "/search",
  connections: "/connections",
  messages: "/messages",
  calls: "/calls",
  communities: "/communities",
  jobs: "/jobs",
  projects: "/projects",
  aiCareer: "/ai-career",
  guidelines: "/guidelines",
  admin: "/admin",
  jobApplications: "/jobs/applications",
  projectProposals: "/projects/proposals",
  myProfile: "/profile/me",
  editProfile: "/profile/edit",
  previewProfile: "/profile/preview",
  profilePattern: "/profile/:userId",
  accessDenied: "/access-denied",
  designPreview: "/design-preview",
} as const;

export function profilePath(userId: string): string {
  return `/profile/${encodeURIComponent(userId)}`;
}
