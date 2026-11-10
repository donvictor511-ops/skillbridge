// The first part of every profile cache key. Using one shared value lets us
// remove ALL cached profiles at once (for example, when someone logs out).
export const profileRootKey = ["profiles"] as const;
