import type { ReactElement } from "react";
import { ChoiceGroup } from "../../components/forms/ChoiceGroup";
import { capabilityOptions } from "./onboardingOptions";
import type { StepProps } from "./stepTypes";

export function AccountTypeStep({
  values,
  errors,
  onChange,
}: StepProps): ReactElement {
  return (
    <ChoiceGroup
      id="onboarding-capabilities"
      legend="How will you use SkillBridge?"
      hint="Choose one or both. You can add the other later."
      variant="card"
      required
      options={capabilityOptions}
      selected={values.capabilities}
      onChange={(next) => onChange({ capabilities: next })}
      error={errors.capabilities}
    />
  );
}
