import type { OnboardingInput } from "../../types/onboarding";

// What every wizard step receives.
export interface StepProps {
  values: OnboardingInput;
  // field name -> message
  errors: Record<string, string>;
  // Update some of the values (the wizard also clears their errors).
  onChange: (patch: Partial<OnboardingInput>) => void;
}
