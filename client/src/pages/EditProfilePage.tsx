import type { ReactElement } from "react";
import { Link } from "react-router";
import { paths } from "../app/paths";
import { ErrorMessage, getButtonClasses } from "../components/ui";
import { BasicsForm } from "../features/profiles/edit/BasicsForm";
import { BusinessForm } from "../features/profiles/edit/BusinessForm";
import { EducationManager } from "../features/profiles/edit/EducationManager";
import { ExperienceManager } from "../features/profiles/edit/ExperienceManager";
import { ProjectsManager } from "../features/profiles/edit/ProjectsManager";
import { SkillsEditor } from "../features/profiles/edit/SkillsEditor";
import { ProfilePreferencesForm } from "../features/profiles/edit/ProfilePreferencesForm";
import { useMyProfile } from "../features/profiles/profileQueries";
import { ProfileSkeleton } from "../features/profiles/ProfileStates";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function EditProfilePage(): ReactElement {
  const profileQuery = useMyProfile();

  useDocumentTitle("Edit profile | SkillBridge");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">
            Edit profile
          </h1>
          <p className="mt-2 text-sm text-muted">
            Each section saves on its own. Nothing changes until you press Save.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to={paths.previewProfile}
            className={getButtonClasses({
              variant: "secondary",
              size: "md",
              fullWidth: false,
            })}
          >
            Preview as visitor
          </Link>
          <Link
            to={paths.myProfile}
            className={getButtonClasses({
              variant: "secondary",
              size: "md",
              fullWidth: false,
            })}
          >
            Back to profile
          </Link>
        </div>
      </div>

      <div className="mt-6">
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
          <div className="space-y-6">
            <BasicsForm profile={profileQuery.data} />
            <ProfilePreferencesForm profile={profileQuery.data} />
            <SkillsEditor profile={profileQuery.data} />
            <ExperienceManager experiences={profileQuery.data.experiences} />
            <EducationManager education={profileQuery.data.education} />
            <ProjectsManager
              projects={profileQuery.data.projects}
              skills={profileQuery.data.skills}
            />
            {profileQuery.data.accountTypes.includes("client") ? (
              <BusinessForm business={profileQuery.data.business} />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
