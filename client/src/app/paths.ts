// Every route path lives here, so a path is never
// typed by hand in two places.
export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  discover: "/discover",
  myProfile: "/profile/me",
  editProfile: "/profile/edit",
  previewProfile: "/profile/preview",
  profilePattern: "/profile/:userId",
  accessDenied: "/access-denied",
  designPreview: "/design-preview",
} as const;

// A link to someone's profile page.
export function profilePath(userId: string): string {
  return `/profile/${encodeURIComponent(userId)}`;
}
