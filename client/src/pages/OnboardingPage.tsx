import type { ReactElement } from "react";
import { Navigate } from "react-router";
import { paths } from "../app/paths";
import { useCurrentUser } from "../features/auth/authQueries";
import { OnboardingWizard } from "../features/onboarding/OnboardingWizard";

export default function OnboardingPage(): ReactElement {
  const { data: user } = useCurrentUser();

  // Already finished? Nothing to do here. This also handles the moment right
  // after a successful save: the cached user now has onboardedAt. Show the
  // profile they just created so the setup has a clear visible result.
  if (user?.onboardedAt) {
    return <Navigate to={paths.myProfile} replace />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <OnboardingWizard />
    </div>
  );
}
