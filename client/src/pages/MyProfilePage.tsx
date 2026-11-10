import type { ReactElement } from "react";
import { ErrorMessage } from "../components/ui";
import { useMyProfile } from "../features/profiles/profileQueries";
import { ProfileSkeleton } from "../features/profiles/ProfileStates";
import { ProfileView } from "../features/profiles/ProfileView";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

// YOUR profile. Needs a login (the router guards it), and shows who can see it.
export default function MyProfilePage(): ReactElement {
  const profileQuery = useMyProfile();

  useDocumentTitle("Your profile | SkillBridge");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {profileQuery.isPending ? <ProfileSkeleton /> : null}

      {profileQuery.isError ? (
        <ErrorMessage
          title="Could not load your profile"
          message="Check your connection and try again."
          onRetry={() => {
            void profileQuery.refetch();
          }}
        />
      ) : null}

      {profileQuery.data ? (
        <ProfileView
          profile={profileQuery.data}
          owner={{ visibility: profileQuery.data.visibility }}
        />
      ) : null}
    </div>
  );
}
