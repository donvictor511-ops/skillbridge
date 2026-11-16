import type { ReactElement } from "react";
import { Link } from "react-router";
import { Eye } from "lucide-react";
import { paths } from "../app/paths";
import { ErrorMessage, getButtonClasses } from "../components/ui";
import { useMyProfile } from "../features/profiles/profileQueries";
import { ProfileSkeleton } from "../features/profiles/ProfileStates";
import { ProfileView } from "../features/profiles/ProfileView";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { ProfileVisibility } from "../types/profile";

// Who can really see the profile right now.
const whoCanSee: Record<ProfileVisibility, string> = {
  public:
    "Your profile is public. Anyone can see it like this, even without an account.",
  members:
    "Your profile is visible to members only. People who are logged in see it like this. Visitors who are logged out are asked to log in first.",
  private:
    "Your profile is private, so nobody else can see it right now. This is how it would look if you made it visible.",
};

// Your own profile, drawn the way a visitor sees it. It uses the same view as
// the real profile page, but WITHOUT the owner information, so empty sections
// are hidden and no private details are shown.
export default function PreviewProfilePage(): ReactElement {
  const profileQuery = useMyProfile();

  useDocumentTitle("Preview | SkillBridge");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-navy">
          Preview: this is what visitors see
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to={paths.editProfile}
            className={getButtonClasses({
              variant: "primary",
              size: "sm",
              fullWidth: false,
            })}
          >
            Back to edit
          </Link>
          <Link
            to={paths.myProfile}
            className={getButtonClasses({
              variant: "secondary",
              size: "sm",
              fullWidth: false,
            })}
          >
            My profile
          </Link>
        </div>
      </div>

      {profileQuery.isPending ? (
        <div className="mt-6">
          <ProfileSkeleton />
        </div>
      ) : null}

      {profileQuery.isError ? (
        <ErrorMessage
          className="mt-6"
          title="Could not load your profile"
          message="Check your connection and try again."
          onRetry={() => {
            void profileQuery.refetch();
          }}
        />
      ) : null}

      {profileQuery.data ? (
        <>
          <div
            role="note"
            className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm"
          >
            <Eye
              className="mt-0.5 h-5 w-5 shrink-0 text-navy"
              aria-hidden="true"
            />
            <p className="text-ink">
              {whoCanSee[profileQuery.data.visibility]} You can change this in
              the Basics section of{" "}
              <Link
                to={paths.editProfile}
                className="rounded-control font-semibold text-brand underline underline-offset-4 hover:text-brand-hover"
              >
                Edit profile
              </Link>
              .
            </p>
          </div>

          {/* No "owner" information: this is the visitor view. */}
          <div className="mt-6">
            <ProfileView profile={profileQuery.data} />
          </div>
        </>
      ) : null}
    </div>
  );
}
