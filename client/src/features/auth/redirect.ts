import { paths } from "../../app/paths";

// ProtectedRoute remembers the page you wanted in location.state.from.
// After login we send you there. We only accept an internal path, so nobody
// can craft a link that bounces you to another website.
export function getSafeRedirectPath(state: unknown): string {
  if (
    typeof state === "object" &&
    state !== null &&
    "from" in state &&
    typeof state.from === "string"
  ) {
    const from = state.from;

    const isInternalPath = from.startsWith("/") && !from.startsWith("//");
    const isAuthPage =
      from.startsWith(paths.login) || from.startsWith(paths.register);

    if (isInternalPath && !isAuthPage) {
      return from;
    }
  }

  return paths.posts;
}
