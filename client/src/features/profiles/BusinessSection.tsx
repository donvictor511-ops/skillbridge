import type { ReactElement } from "react";
import { ExternalLink } from "../../components/ui";
import type { ProfileBusiness } from "../../types/profile";
import { ProfileSection } from "./ProfileSection";

interface BusinessSectionProps {
  business: ProfileBusiness;
}

// Shown only for accounts that are a client or business and have filled in
// their company details.
export function BusinessSection({
  business,
}: BusinessSectionProps): ReactElement {
  return (
    <ProfileSection title="Company">
      <h3 className="break-words text-base font-semibold text-navy">
        {business.companyName}
      </h3>

      <dl className="mt-3 space-y-2 text-sm">
        {business.industry ? (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted">Industry</dt>
            <dd className="break-words text-ink">{business.industry}</dd>
          </div>
        ) : null}
        {business.sizeRange ? (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted">Company size</dt>
            <dd className="text-ink">{business.sizeRange} people</dd>
          </div>
        ) : null}
        {business.websiteUrl ? (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted">Website</dt>
            <dd className="min-w-0 break-words">
              <ExternalLink href={business.websiteUrl}>
                Visit website
              </ExternalLink>
            </dd>
          </div>
        ) : null}
      </dl>

      {business.about ? (
        <p className="mt-4 whitespace-pre-line break-words text-sm text-ink">
          {business.about}
        </p>
      ) : null}
    </ProfileSection>
  );
}
