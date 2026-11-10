import type { ReactElement } from "react";
import { Link, useLocation } from "react-router";
import { Lock, SearchX } from "lucide-react";
import { paths } from "../../app/paths";
import { PageMessage } from "../../components/layout/PageMessage";
import {
  Card,
  ErrorMessage,
  Skeleton,
  getButtonClasses,
} from "../../components/ui";
import { getApiErrorInfo } from "../../lib/apiError";

// Looks like the page, so nothing jumps when the real content arrives.
export function ProfileSkeleton(): ReactElement {
  return (
    <div className="space-y-6" aria-busy="true">
      <Card padding="none" className="overflow-hidden">
        <Skeleton className="h-32 w-full sm:h-48" />
        <div className="px-4 pb-6 sm:px-8">
          <Skeleton className="-mt-12 h-24 w-24 rounded-full sm:-mt-14" />
          <Skeleton className="mt-4 h-8 w-2/3" />
          <Skeleton className="mt-2 h-5 w-1/2" />
          <Skeleton className="mt-3 h-4 w-1/3" />
        </div>
      </Card>
      <Card padding="lg">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
      </Card>
      <Card padding="lg">
        <Skeleton className="h-5 w-24" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </Card>
    </div>
  );
}

interface ProfileProblemProps {
  error: unknown;
  onRetry: () => void;
}

// Explains why a profile could not be shown, in a friendly way.
export function ProfileProblem({
  error,
  onRetry,
}: ProfileProblemProps): ReactElement {
  const location = useLocation();
  const info = getApiErrorInfo(error);

  if (info.code === "LOGIN_REQUIRED") {
    return (
      <PageMessage
        icon={Lock}
        title="Log in to view this profile"
        description="This profile is only visible to people who are logged in to SkillBridge."
        actions={
          <>
            <Link
              to={paths.login}
              // After logging in, the visitor comes straight back here.
              state={{ from: location.pathname }}
              className={getButtonClasses({
                variant: "primary",
                size: "md",
                fullWidth: false,
              })}
            >
              Log in
            </Link>
            <Link
              to={paths.register}
              className={getButtonClasses({
                variant: "secondary",
                size: "md",
                fullWidth: false,
              })}
            >
              Create an account
            </Link>
          </>
        }
      />
    );
  }

  if (info.code === "PROFILE_NOT_FOUND") {
    return (
      <PageMessage
        icon={SearchX}
        code="Error 404"
        title="Profile not found"
        description="This profile does not exist, or it is not shared."
        actions={
          <Link
            to={paths.home}
            className={getButtonClasses({
              variant: "primary",
              size: "md",
              fullWidth: false,
            })}
          >
            Go to home
          </Link>
        }
      />
    );
  }

  return (
    <ErrorMessage className="mt-8" message={info.message} onRetry={onRetry} />
  );
}
