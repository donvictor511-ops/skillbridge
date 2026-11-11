import type { ReactElement } from "react";
import { Link } from "react-router";
import { Pencil } from "lucide-react";
import { paths } from "../app/paths";
import { ErrorMessage, getButtonClasses } from "../components/ui";
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
        <>
          <div className="mb-4 flex justify-end">
            <Link
              to={paths.editProfile}
              className={getButtonClasses({
                variant: "primary",
                size: "md",
                fullWidth: false,
              })}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit profile
            </Link>
          </div>
          <ProfileView
            profile={profileQuery.data}
            owner={{ visibility: profileQuery.data.visibility }}
          />
        </>
      ) : null}
    </div>
  );
}
