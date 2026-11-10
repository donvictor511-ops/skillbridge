import { useState } from "react";
import type { ReactElement } from "react";
import { MapPin } from "lucide-react";
import { Avatar, Badge, Card } from "../../components/ui";
import { isSafeHttpsUrl } from "../../lib/url";
import type { PublicProfile } from "../../types/profile";
import { capabilityOptions } from "../onboarding/onboardingOptions";

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
  const avatarSrc =
    profile.avatarUrl !== null && isSafeHttpsUrl(profile.avatarUrl)
      ? profile.avatarUrl
      : null;

  return (
    <Card padding="none" className="overflow-hidden">
      <CoverImage src={profile.coverUrl} />

      <div className="px-4 pb-6 sm:px-8">
        <div className="-mt-12 sm:-mt-14">
          <Avatar
            name={profile.displayName}
            src={avatarSrc}
            size="xl"
            className="ring-4 ring-surface"
          />
        </div>

        <h1 className="mt-4 break-words text-2xl font-bold text-navy sm:text-3xl">
          {profile.displayName}
        </h1>

        {profile.headline ? (
          <p className="mt-1 break-words text-base text-ink sm:text-lg">
            {profile.headline}
          </p>
        ) : null}

        {profile.location ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="break-words">{profile.location}</span>
          </p>
        ) : null}

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
    </Card>
  );
}
