import { useState } from "react";
import type { ReactElement } from "react";
import { Check, UserPlus } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useFollowUser, useUnfollowUser } from "./followsQueries";

interface FollowToggleButtonProps {
  userId: string;
  isFollowing: boolean;
  followLabel?: string;
  followingLabel?: string;
}

export function FollowToggleButton({
  userId,
  isFollowing,
  followLabel = "Follow",
  followingLabel = "Following",
}: FollowToggleButtonProps): ReactElement {
  const [hasError, setHasError] = useState(false);
  const follow = useFollowUser(userId);
  const unfollow = useUnfollowUser(userId);
  const isPending = follow.isPending || unfollow.isPending;

  async function toggleFollow(): Promise<void> {
    setHasError(false);
    try {
      if (isFollowing) await unfollow.mutateAsync();
      else await follow.mutateAsync();
    } catch {
      setHasError(true);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        size="sm"
        variant={isFollowing ? "secondary" : "primary"}
        onClick={() => void toggleFollow()}
        loading={isPending}
        disabled={isPending}
        aria-label={isFollowing ? "Unfollow this member" : followLabel}
        aria-pressed={isFollowing}
      >
        {isFollowing ? <Check className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
        {isFollowing ? followingLabel : followLabel}
      </Button>
      {hasError ? <span role="alert" className="text-xs text-danger-strong">Could not update follow status.</span> : null}
    </span>
  );
}
