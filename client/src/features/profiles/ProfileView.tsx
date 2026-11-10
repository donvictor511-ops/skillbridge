import type { ReactElement } from "react";
import { Globe, Lock, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProfileVisibility, PublicProfile } from "../../types/profile";
import { AboutSection } from "./AboutSection";
import { BusinessSection } from "./BusinessSection";
import { EducationSection } from "./EducationSection";
import { ExperienceSection } from "./ExperienceSection";
import { ProfileHeader } from "./ProfileHeader";
import { ProjectsSection } from "./ProjectsSection";
import { SkillsSection } from "./SkillsSection";

interface VisibilityInfo {
  icon: LucideIcon;
  label: string;
  explanation: string;
}

const visibilityInfo: Record<ProfileVisibility, VisibilityInfo> = {
  public: {
    icon: Globe,
    label: "Public",
    explanation: "Anyone can see this profile, even without an account.",
  },
  members: {
    icon: Users,
    label: "Members only",
    explanation:
      "Only people who are logged in to SkillBridge can see this profile.",
  },
  private: {
    icon: Lock,
    label: "Private",
    explanation: "Only you can see this profile.",
  },
};

interface ProfileViewProps {
  profile: PublicProfile;
  // Present only when the person is looking at their OWN profile.
  owner?: { visibility: ProfileVisibility };
}

// Puts all the sections together. It receives only what the API allowed.
export function ProfileView({
  profile,
  owner,
}: ProfileViewProps): ReactElement {
  const isOwner = owner !== undefined;
  const visibility = owner ? visibilityInfo[owner.visibility] : null;
  const VisibilityIcon = visibility?.icon;

  return (
    <div className="space-y-6">
      {visibility && VisibilityIcon ? (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
          <VisibilityIcon
            className="mt-0.5 h-5 w-5 shrink-0 text-navy"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-navy">
              This is your profile. Visibility: {visibility.label}
            </p>
            <p className="mt-0.5 text-muted">{visibility.explanation}</p>
          </div>
        </div>
      ) : null}

      <ProfileHeader profile={profile} />
      <AboutSection
        bio={profile.bio}
        interests={profile.interests}
        isOwner={isOwner}
      />
      <SkillsSection skills={profile.skills} isOwner={isOwner} />
      <ExperienceSection experiences={profile.experiences} isOwner={isOwner} />
      <EducationSection education={profile.education} isOwner={isOwner} />
      <ProjectsSection projects={profile.projects} isOwner={isOwner} />
      {profile.business ? (
        <BusinessSection business={profile.business} />
      ) : null}
    </div>
  );
}
