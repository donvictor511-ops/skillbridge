import type { ProfileVisibility } from "../../../types/profile";

interface VisibilityOption {
  value: ProfileVisibility;
  label: string;
  hint: string;
}

export const visibilityOptions: readonly VisibilityOption[] = [
  {
    value: "public",
    label: "Public: anyone, even without an account",
    hint: "Anyone with the link can see your profile, even without an account.",
  },
  {
    value: "members",
    label: "Members only: people who are logged in",
    hint: "Only people who are logged in to SkillBridge can see your profile.",
  },
  {
    value: "private",
    label: "Private: only you",
    hint: "Only you can see your profile. Nobody else can find it.",
  },
];

// Checks that text from a <select> really is one of our three values.
export function isProfileVisibility(value: string): value is ProfileVisibility {
  return visibilityOptions.some((option) => option.value === value);
}
