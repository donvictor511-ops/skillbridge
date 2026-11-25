import type { ReactElement } from "react";
import { Check, Clock, MessageCircle, UserPlus, UserMinus, X } from "lucide-react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, getButtonClasses } from "../../components/ui";
import { paths } from "../../app/paths";
import { profileKeys } from "./profileQueries";
import { useCurrentUser } from "../auth/authQueries";
import {
  useConnections,
  useSendConnectionRequest,
  useAcceptConnectionRequest,
  useRejectConnectionRequest,
  useRemoveConnection,
} from "../connections/connectionsQueries";
import { useFollowUser, useUnfollowUser } from "../follows/followsQueries";

interface ProfileConnectionActionsProps {
  profileUserId: string;
  isFollowing: boolean;
}

export function ProfileConnectionActions({
  profileUserId,
  isFollowing,
}: ProfileConnectionActionsProps): ReactElement | null {
  const queryClient = useQueryClient();

  const { data: currentUser, isPending: authLoading } = useCurrentUser();

  const { data: connections = [], isPending: connectionsLoading } =
    useConnections(undefined, Boolean(currentUser) && !authLoading, 5000);

  const sendRequest = useSendConnectionRequest();
  const acceptRequest = useAcceptConnectionRequest();
  const rejectRequest = useRejectConnectionRequest();
  const removeConnection = useRemoveConnection();
  const follow = useFollowUser(profileUserId);
  const unfollow = useUnfollowUser(profileUserId);

  const connection = connections.find(
    (item) => item.user.userId === profileUserId,
  );

  const isMutating =
    sendRequest.isPending ||
    acceptRequest.isPending ||
    rejectRequest.isPending ||
    removeConnection.isPending ||
    follow.isPending ||
    unfollow.isPending;

  async function refreshProfileData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: profileKeys.detail(profileUserId),
      }),
      queryClient.invalidateQueries({
        queryKey: profileKeys.me,
      }),
    ]);
  }

  function handleConnect() {
    sendRequest.mutate(profileUserId, {
      onSuccess: () => void refreshProfileData(),
    });
  }

  function handleAccept() {
    if (!connection) return;

    acceptRequest.mutate(connection.id, {
      onSuccess: () => void refreshProfileData(),
    });
  }

  function handleReject() {
    if (!connection) return;

    rejectRequest.mutate(connection.id, {
      onSuccess: () => void refreshProfileData(),
    });
  }

  function handleRemove() {
    if (!connection) return;

    removeConnection.mutate(connection.id, {
      onSuccess: () => void refreshProfileData(),
    });
  }

  // Wait until authentication is resolved.
  if (authLoading) {
    return (
      <div className="mt-4 text-sm text-muted" aria-live="polite">
        Loading connection status...
      </div>
    );
  }

  // Guests can view public profiles but cannot manage connections.
  if (!currentUser) {
    return null;
  }

  if (!currentUser.onboardedAt) return null;

  const messageLink = (
    <Link
      to={`${paths.messages}?userId=${encodeURIComponent(profileUserId)}`}
      className={getButtonClasses({ variant: "secondary", size: "md", fullWidth: false })}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      Message
    </Link>
  );

  const followButton = (
    <Button
      variant={isFollowing ? "secondary" : "primary"}
      onClick={() => (isFollowing ? unfollow.mutate() : follow.mutate())}
      loading={follow.isPending || unfollow.isPending}
      disabled={isMutating}
      aria-label={isFollowing ? "Unfollow this member" : "Follow this member"}
      aria-pressed={isFollowing}
    >
      {isFollowing ? <Check className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );

  const followError = follow.isError || unfollow.isError ? (
    <p className="w-full text-sm text-danger" role="alert">
      Could not update follow status. Please try again.
    </p>
  ) : null;

  // Wait for the authenticated user's connection list.
  if (connectionsLoading) {
    return (
      <div className="mt-4 text-sm text-muted" aria-live="polite">
        Loading connection status...
      </div>
    );
  }

  // No relationship yet.
  if (!connection) {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          onClick={handleConnect}
          loading={sendRequest.isPending}
          disabled={isMutating}
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Connect
        </Button>
        {followButton}
        {messageLink}

        {sendRequest.isError ? (
          <p className="mt-2 text-sm text-danger" role="alert">
            Could not send connection request. Please try again.
          </p>
        ) : null}
        {followError}
      </div>
    );
  }

  // Already connected.
  if (connection.status === "accepted") {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {followButton}
        <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-2 text-sm font-medium text-success">
          <Check className="h-4 w-4" aria-hidden="true" />
          Connected
        </span>
        {messageLink}

        <Button
          variant="danger"
          size="sm"
          onClick={handleRemove}
          loading={removeConnection.isPending}
          disabled={isMutating}
        >
          <UserMinus className="h-4 w-4" aria-hidden="true" />
          Remove connection
        </Button>

        {removeConnection.isError ? (
          <p className="w-full text-sm text-danger" role="alert">
            Could not remove connection. Please try again.
          </p>
        ) : null}
        {followError}
      </div>
    );
  }

  // Request sent by the current user.
  if (connection.status === "pending" && connection.direction === "outgoing") {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {followButton}
        <span className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-2 text-sm font-medium text-muted">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Request pending
        </span>
        {messageLink}

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRemove}
          loading={removeConnection.isPending}
          disabled={isMutating}
        >
          Cancel request
        </Button>

        {removeConnection.isError ? (
          <p className="w-full text-sm text-danger" role="alert">
            Could not cancel request. Please try again.
          </p>
        ) : null}
        {followError}
      </div>
    );
  }

  // Request received from the other person.
  if (connection.status === "pending" && connection.direction === "incoming") {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {followButton}
        <span className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-2 text-sm font-medium text-muted">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Received connection request
        </span>
        {messageLink}

        <Button
          size="sm"
          onClick={handleAccept}
          loading={acceptRequest.isPending}
          disabled={isMutating}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Accept
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleReject}
          loading={rejectRequest.isPending}
          disabled={isMutating}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Reject
        </Button>

        {acceptRequest.isError || rejectRequest.isError ? (
          <p className="w-full text-sm text-danger" role="alert">
            Could not update request. Please try again.
          </p>
        ) : null}
        {followError}
      </div>
    );
  }

  // Rejected request.
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {followButton}
      <span className="inline-flex items-center gap-2 rounded-full bg-page px-3 py-2 text-sm font-medium text-muted">
        Request rejected
      </span>
      {messageLink}

      <Button
        variant="secondary"
        size="sm"
        onClick={handleRemove}
        loading={removeConnection.isPending}
        disabled={isMutating}
      >
        Remove previous request
      </Button>

      {removeConnection.isError ? (
        <p className="w-full text-sm text-danger" role="alert">
          Could not remove previous request. Please try again.
        </p>
      ) : null}
      {followError}
    </div>
  );
}
