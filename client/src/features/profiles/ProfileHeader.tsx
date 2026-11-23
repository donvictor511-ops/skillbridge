import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { MapPin, Users, X } from "lucide-react";
import { Avatar, Badge, Card } from "../../components/ui";
import { isSafeHttpsUrl } from "../../lib/url";
import type { PublicProfile } from "../../types/profile";
import { capabilityOptions } from "../onboarding/onboardingOptions";
import { ProfileActionsMenu } from "./ProfileActionsMenu";

interface CoverImageProps {
  src: string | null;
}

// A decorative banner. If there is no picture, or it fails to load, we show a
// brand gradient instead, never a broken-image icon.
function CoverImage({ src }: CoverImageProps): ReactElement {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const imageSrc =
    src !== null && isSafeHttpsUrl(src) && src !== failedSrc ? src : null;

  return (
    <div className="h-32 w-full overflow-hidden bg-linear-to-r from-navy to-brand sm:h-48">
      {imageSrc !== null ? (
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(imageSrc)}
          className="h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}

interface ProfileHeaderProps {
  profile: PublicProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps): ReactElement {
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const avatarSrc =
    profile.avatarUrl !== null && isSafeHttpsUrl(profile.avatarUrl)
      ? profile.avatarUrl
      : null;

  useEffect(() => {
    if (!isAvatarOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsAvatarOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isAvatarOpen]);

  return (
    <Card padding="none">
      <CoverImage src={profile.coverUrl} />

      <div className="relative px-4 pb-6 sm:px-8">
        <ProfileActionsMenu userId={profile.userId} displayName={profile.displayName} joinedAt={profile.joinedAt} />
        <div className="-mt-12 sm:-mt-14">
          {avatarSrc ? (
            <button
              type="button"
              onClick={() => setIsAvatarOpen(true)}
              aria-label={`View ${profile.displayName}'s profile photo`}
              className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              <Avatar name={profile.displayName} src={avatarSrc} size="xl" className="ring-4 ring-surface" />
            </button>
          ) : (
            <Avatar name={profile.displayName} size="xl" className="ring-4 ring-surface" />
          )}
        </div>

        <h1 className="mt-4 break-words text-2xl font-bold text-navy sm:text-3xl">
          {profile.displayName}
        </h1>

        {profile.headline ? (
          <p className="mt-1 break-words text-base text-ink sm:text-lg">
            {profile.headline}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          {profile.location ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="break-words">{profile.location}</span>
            </span>
          ) : null}

          <span
            className="flex items-center gap-1.5"
            aria-label={`${profile.connectionCount} accepted connections`}
          >
            <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {profile.connectionCount}{" "}
              {profile.connectionCount === 1 ? "connection" : "connections"}
            </span>
          </span>
        </div>

        {profile.accountTypes.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Account type">
            {profile.accountTypes.map((type) => (
              <li key={type}>
                <Badge tone="accent">
                  {capabilityOptions.find((option) => option.value === type)
                    ?.label ?? type}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {isAvatarOpen && avatarSrc ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${profile.displayName}'s profile photo`}
          onClick={() => setIsAvatarOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"
        >
          <button
            type="button"
            onClick={() => setIsAvatarOpen(false)}
            aria-label="Close profile photo"
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
          <img
            src={avatarSrc}
            alt={`${profile.displayName}'s profile photo`}
            onClick={(event) => event.stopPropagation()}
            referrerPolicy="no-referrer"
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      , document.body) : null}
    </Card>
  );
}
