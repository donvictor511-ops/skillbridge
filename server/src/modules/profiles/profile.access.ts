import type { ProfileVisibility } from "./profile.options";

export type ProfileAccess = "allowed" | "login_required" | "not_found";

// THE privacy rule for viewing a profile. Every decision goes through here.
// It is a pure function (no database, no request), so it is easy to read and
// to test.
export function decideProfileAccess(
  visibility: ProfileVisibility,
  isOwner: boolean,
  isLoggedIn: boolean,
): ProfileAccess {
  // You can always see your own profile.
  if (isOwner) {
    return "allowed";
  }

  if (visibility === "public") {
    return "allowed";
  }

  if (visibility === "members") {
    return isLoggedIn ? "allowed" : "login_required";
  }

  // "private": everyone else gets the same answer as for a missing profile,
  // so the profile's existence is not revealed.
  return "not_found";
}
