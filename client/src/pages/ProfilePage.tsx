import type { ReactElement } from "react";
import { Navigate, useParams } from "react-router";
import { paths } from "../app/paths";
import { useCurrentUser } from "../features/auth/authQueries";
import { useProfile } from "../features/profiles/profileQueries";
import {
  ProfileProblem,
  ProfileSkeleton,
} from "../features/profiles/ProfileStates";
import { ProfileView } from "../features/profiles/ProfileView";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

// Someone's profile, as the current visitor is allowed to see it.
// Works for logged-out visitors too (the API decides what they may see).
export default function ProfilePage(): ReactElement {
  const { userId = "" } = useParams();
  const { data: currentUser } = useCurrentUser();
  const profileQuery = useProfile(userId, 5000);

  useDocumentTitle(
    profileQuery.data
      ? `${profileQuery.data.displayName} | SkillBridge`
      : "Profile | SkillBridge",
  );

  // Looking at your own id? Show the owner view, with its visibility note.
  if (currentUser && currentUser.id === userId) {
    return <Navigate to={paths.myProfile} replace />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {profileQuery.isPending ? <ProfileSkeleton /> : null}

      {profileQuery.isError ? (
        <ProfileProblem
          error={profileQuery.error}
          onRetry={() => {
            void profileQuery.refetch();
          }}
        />
      ) : null}

      {profileQuery.data ? <ProfileView profile={profileQuery.data} /> : null}
    </div>
  );
}
