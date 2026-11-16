// Every route path lives here, so a path is never typed by hand in two places.
export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  myProfile: "/profile/me",
  editProfile: "/profile/edit",
  previewProfile: "/profile/preview",
  // The pattern used by the router. Use profilePath() to build a real link.
  profilePattern: "/profile/:userId",
  accessDenied: "/access-denied",
  // TEMPORARY: removed when the real pages are built.
  designPreview: "/design-preview",
} as const;

// A link to someone's profile page.
export function profilePath(userId: string): string {
  return `/profile/${encodeURIComponent(userId)}`;
}
