export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  discover: "/discover",
  connections: "/connections",
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
