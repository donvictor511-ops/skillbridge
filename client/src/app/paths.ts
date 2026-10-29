// Every route path lives here, so a path is never typed by hand in two places.
export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  accessDenied: "/access-denied",
  // TEMPORARY: removed when the real pages are built.
  designPreview: "/design-preview",
} as const;
