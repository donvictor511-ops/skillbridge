import type { ReactElement } from "react";
import { Input } from "../../components/ui";
import type { StepProps } from "./stepTypes";

export function AboutYouStep({
  values,
  errors,
  onChange,
}: StepProps): ReactElement {
  return (
    <div className="space-y-5">
      <Input
        id="onboarding-displayName"
        label="Name or business name"
        autoComplete="name"
        required
        value={values.displayName}
        onChange={(event) => onChange({ displayName: event.target.value })}
        error={errors.displayName}
      />

      <Input
        id="onboarding-headline"
        label="Headline (optional)"
        hint="For example: Product designer, or Marketing agency for startups."
        value={values.headline}
        onChange={(event) => onChange({ headline: event.target.value })}
        error={errors.headline}
      />

      <Input
        id="onboarding-location"
        label="Location (optional)"
        hint="A city or country, or Remote."
        autoComplete="address-level2"
        value={values.location}
        onChange={(event) => onChange({ location: event.target.value })}
        error={errors.location}
      />
    </div>
  );
}
