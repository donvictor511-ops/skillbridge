# API Specification

Base path: `/api/v1`. Success: `{ "data": ... }`.
Error: `{ "error": { "code", "message", "details?" } }`.

## GET /search?q={term}

Authenticated and available after onboarding. Searches visible profiles and skills, published posts and comments, member-visible community discussions, communities, open jobs, and active projects. Returns a small set of matches from each source. Private or held content is excluded.

## GET /health

Public. Is the API running? Returns 200.

## GET /health/db

Public. Can the API reach PostgreSQL? Returns 200, or 503 `DATABASE_UNAVAILABLE`.

## POST /auth/register

Public. Creates an account.

Request body:

- `email` (string, required): trimmed, lowercased, valid, up to 254 characters
- `password` (string, required): 12 to 128 characters, not a very common password

Responses:

- 201: `{ "data": { "user": { "id", "email", "createdAt" } } }` and a
  `Set-Cookie: sb_session=...` (the new account starts logged in)
- 400 `VALIDATION_ERROR`: invalid input, with `details` per field
- 400 `INVALID_JSON`: the body is not valid JSON
- 409 `EMAIL_ALREADY_REGISTERED`: the email is already in use
- 413 `PAYLOAD_TOO_LARGE`: the body is bigger than 10 KB

The response never contains the password or its hash.

## POST /auth/login

Public. Body: `email`, `password`. Starts a session.

- 200: `{ "data": { "user": { "id", "email", "createdAt" } } }` and a
  `Set-Cookie: sb_session=...` (HttpOnly, SameSite=Lax, 7 days)
- 400 `VALIDATION_ERROR`
- 401 `INVALID_CREDENTIALS`: same message for wrong email and wrong password

## POST /auth/logout

Public and safe to repeat. Ends the session and clears the cookie. Returns 204.

## GET /auth/me

Requires a session. Returns 200 `{ "data": { "user": {...} } }`, or
401 `UNAUTHENTICATED`.

## POST /onboarding

Requires a session. Completes account setup in one transaction.

Body: `capabilities` (1-2 of professional, client), `displayName` (1-80),
`headline` (optional, max 120), `location` (optional, max 80),
`skills` (0-15 names, max 40 characters each), `interests` (0-8 codes),
`goals` (1+ codes).

- 201: `{ "data": { "user": {..., "capabilities", "onboardedAt" } } }`
- 400 `VALIDATION_ERROR` (with `details`, for example field `skills.2`)
- 401 `UNAUTHENTICATED`
- 409 `ONBOARDING_ALREADY_COMPLETED`

`GET /auth/me` and the login/register responses now include `capabilities`
and `onboardedAt`.

## Profiles

Profile responses are sent with `Cache-Control: private, no-store`.

### GET /profiles/me

Requires a session. Returns `{ "data": { "profile": OwnerProfile } }`: everything
public, plus `visibility`, `goals`, `createdAt`, `updatedAt`.
404 `PROFILE_NOT_FOUND` if onboarding has not created a profile yet.

### PATCH /profiles/me

Requires a session. Edits only the caller's own profile (the id comes from the
session). All fields optional, at least one required: `displayName`, `headline`,
`location`, `bio`, `avatarUrl`, `coverUrl`, `visibility`, `interests`, `goals`.
`null` or `""` clears an optional text field. Links must be `https://`.
Unknown fields are ignored. Returns the updated OwnerProfile.

### PUT /profiles/me/skills

Requires a session. Body `{ "skills": ["React", ...] }` (max 15). Replaces the
whole list. Returns the updated OwnerProfile.

### GET /profiles/:userId

Public endpoint with privacy rules (optional session).

- `public`: anyone. `members`: logged-in users only (otherwise 401
  `LOGIN_REQUIRED`). `private`: only the owner (others get 404).
- The owner can always view their own profile.
- A malformed or unknown id gives 404 `PROFILE_NOT_FOUND`.
- Returns `{ "data": { "profile": PublicProfile } }`. Never includes email,
  goals, or visibility. `joinedAt` is the account creation date.

### Block and report a profile

All require a session. Blocking removes the connection and prevents either user
from viewing the other's profile, starting or continuing messages, or connecting.
Reports are saved for moderation review and accept a reason (`spam`,
`harassment`, `inappropriate_content`, `impersonation`, or `other`) plus optional
details (up to 1000 characters).

- `POST /profiles/:userId/block` (idempotent),
  `DELETE /profiles/:userId/block` (unblock)
- `POST /profiles/:userId/report` with `{ "reason": "spam", "details": "..." }`

### Experience and education (your own profile)

All require a session. Each returns the updated OwnerProfile
(`{ "data": { "profile": ... } }`): 201 for create, 200 for replace and delete.

- `POST /profiles/me/experiences`, `PUT /profiles/me/experiences/:experienceId`,
  `DELETE /profiles/me/experiences/:experienceId`
  Body: `title` (1-100), `company` (1-100), `location` (optional, max 100),
  `startDate` ("YYYY-MM"), `endDate` ("YYYY-MM", or null/missing = current),
  `description` (optional, max 2000). Max 20 per profile.
- `POST /profiles/me/education`, `PUT /profiles/me/education/:educationId`,
  `DELETE /profiles/me/education/:educationId`
  Body: `school` (1-120), `degree`, `fieldOfStudy` (optional, max 100),
  `startYear`, `endYear` (integers 1900-2100, optional), `description`
  (optional, max 1000). Max 10 per profile.

`PUT` replaces the whole entry. Ownership is checked inside the database
command. An id that is malformed, missing, or someone else's gives 404
`EXPERIENCE_NOT_FOUND` / `EDUCATION_NOT_FOUND`. Errors: 400 `VALIDATION_ERROR`,
401 `UNAUTHENTICATED`, 409 `LIMIT_REACHED`.

### Portfolio projects (your own profile)

All require a session. Each returns the updated OwnerProfile.

- `POST /profiles/me/projects` (201), `PUT /profiles/me/projects/:projectId` (200),
  `DELETE /profiles/me/projects/:projectId` (200)
  Body: `title` (1-100), `description` (1-2000, required), `projectUrl` and
  `imageUrl` (optional, `https://` only), `skillIds` (up to 10 ids of skills on
  the caller's OWN profile). Max 20 projects per profile.
  A skill id that is not on the caller's skill list gives 400 `VALIDATION_ERROR`
  with detail field `skillIds`. Someone else's or unknown project: 404
  `PROJECT_NOT_FOUND`. Over the limit: 409 `LIMIT_REACHED`.
  Removing a skill from the profile also removes it from the caller's projects.

### Company details (client or business accounts)

- `PUT /profiles/me/business` creates or updates the caller's company details.
  Body: `companyName` (1-120), `websiteUrl` (optional, https), `industry`
  (optional), `sizeRange` (optional: `1-10`, `11-50`, `51-200`, `201-500`,
  `501+`), `about` (optional, max 2000). Needs the `client` capability, otherwise
  403 `NOT_A_BUSINESS_ACCOUNT`.
- `DELETE /profiles/me/business` removes the caller's own company details.

## Connections

All endpoints require an authenticated session and a completed onboarding.
Responses use `Cache-Control: private, no-store`.

### POST /connections/:userId

Sends a connection request to another onboarded user.

- The recipient must have a profile that is not private.
- A user cannot send a request to themselves.
- Only one connection record is allowed per pair of users.

Responses:

- 201: `{ "data": { "id", "status", "requestedById", "createdAt" } }`
- 400 `SELF_CONNECTION`
- 401 `UNAUTHENTICATED`
- 403 `ONBOARDING_REQUIRED`
- 404 `USER_NOT_AVAILABLE`
- 409 `CONNECTION_EXISTS`: a pending, accepted, or previously rejected request exists

### GET /connections

Lists the caller's incoming and outgoing requests, accepted connections, and rejected requests.

Optional query parameter:

- `status`: `pending`, `accepted`, or `rejected`

Each result includes:

- `id`, `status`, `direction`, `createdAt`, `updatedAt`
- `user`: the other participant's `userId`, `displayName`, `headline`,
  `location`, and `avatarUrl`

`direction` is `incoming` or `outgoing`, relative to the authenticated user.

Never exposes email, password hashes, goals, or session data.

Responses:

- 200: `{ "data": [...] }`
- 400 `VALIDATION_ERROR`
- 401 `UNAUTHENTICATED`
- 403 `ONBOARDING_REQUIRED`

### PATCH /connections/:connectionId/accept

Accepts an incoming pending connection request.

- Only the recipient can accept the request.
- A request that has already been handled cannot be accepted again.

Responses:

- 200: `{ "data": { "id", "status", "requestedById", "updatedAt" } }`
- 401 `UNAUTHENTICATED`
- 403 `NOT_REQUEST_RECIPIENT`
- 403 `ONBOARDING_REQUIRED`
- 404 `CONNECTION_NOT_FOUND`

- 409 `REQUEST_NOT_PENDING` or `REQUEST_ALREADY_HANDLED`

### PATCH /connections/:connectionId/reject

Rejects an incoming pending connection request.

Uses the same authorization and response rules as the accept endpoint,
with `status` set to `rejected`.

### DELETE /connections/:connectionId

Removes a connection or cancels a request. Either participant can remove it.

- 204: success, no response body
- 401 `UNAUTHENTICATED`
- 403 `ONBOARDING_REQUIRED`
- 404 `CONNECTION_NOT_FOUND`

## Posts

The feed is readable anonymously for public profiles. Members-only posts require
an authenticated viewer; private posts are visible only to their author.
Post-changing routes require an authenticated, onboarded account.

- `GET /posts?limit=20&cursor=<post-id>` returns `{ data: Post[], nextCursor }`.
- `POST /posts` creates a post. Body: `content` (1-3000), optional `imageUrl`
  or `videoUrl` (HTTPS URL, at most one). `PATCH /posts/:postId` edits the
  caller's post; `DELETE /posts/:postId` removes it.
- `POST /posts/:postId/likes` likes a post idempotently; `DELETE` on the same
  path removes the like. A new like by someone else notifies the post author.
- `POST /posts/:postId/reposts` adds the post to the caller's feed; `DELETE` on
  the same path undoes the caller's repost. A repost references the original
  post, so its author, text, and media remain attributed to the source.
- `POST /posts/:postId/shares` with `{ "recipientId": "<user-id>" }` shares a
  post with one of the caller's accepted connections. The recipient must also
  be allowed to view the post. The recipient receives a notification linking
  back to it.
- `GET /posts/:postId/comments`, `POST /posts/:postId/comments`,
  `PATCH /posts/:postId/comments/:commentId`, and `DELETE` on that comment path
  list and manage comments. Comment bodies use `content` (1-2000) and may
  include one `imageUrl` or `videoUrl`. A new comment notifies the post author.
- `POST /posts/media` accepts multipart field `file`: JPEG, PNG, WebP, MP4, or
  WebM, up to 25 MB. Videos must be no longer than 90 seconds. The verified
  upload is stored with Cloudinary and returns `mediaUrl`, `mediaType`, and
  `duration`. Attach that URL to a post or comment to persist it there.

## Communities and groups

All routes require an authenticated, onboarded account. Communities are public
to discover; only members can read or create discussions and replies. The
community owner and moderators can update group details, review reports, and
moderate content. Only the owner can assign moderator roles or delete a group.

- `GET /communities?search=<text>&mine=true` searches groups or lists the
  caller's memberships; `POST /communities` creates a group with `name`,
  `description`, and optional `guidelines`.
- `GET /communities/:communityId` reads group details, membership, discussions,
  replies, and (for moderators) pending reports.
- `PATCH /communities/:communityId` updates group details; `DELETE` on this
  path deletes the group and its content (owner only).
- `POST /communities/:communityId/membership` joins; `DELETE` leaves.
- `DELETE /communities/:communityId/members/:memberId` removes a member;
  `PATCH` with `{ "role": "moderator" | "member" }` manages moderator roles.
- `POST /communities/:communityId/posts` creates a discussion;
  `DELETE /communities/:communityId/posts/:postId` removes one.
- `POST /communities/:communityId/posts/:postId/comments` adds a reply;
  `DELETE` on that comment path removes it.
- `POST /communities/:communityId/reports` files a group or discussion report.
  Moderators review/dismiss reports with `PATCH /communities/:communityId/reports/:reportId`
  and `{ "status": "reviewed" | "dismissed" }`.
- New discussions and replies notify the relevant group members/authors with a
  `community_post` notification that links to the group.

## Jobs and project marketplace

All marketplace endpoints require an authenticated, onboarded account. Users
with the `client` capability can publish and manage listings. Users with the
`professional` capability can apply to jobs and propose on projects.

- `GET /marketplace/jobs?search=<text>&category=<category>&employmentType=<type>&remote=true|false&status=open|closed|all`
  browses and filters jobs. `POST /marketplace/jobs` publishes a job; `GET` and `PATCH`
  `/marketplace/jobs/:listingId` read and manage its details and status.
- `POST /marketplace/jobs/:listingId/applications` submits a cover letter.
  Listing owners review, accept, or reject applications with
  `PATCH /marketplace/jobs/:listingId/applications/:applicationId`; applicants
  can withdraw their pending applications. `GET /marketplace/jobs/applications/mine`
  tracks the caller's applications.
- `GET /marketplace/projects?search=<text>&category=<category>&status=open|closed|all`
  browses project listings. `POST /marketplace/projects` publishes a project;
  `GET` and `PATCH` `/marketplace/projects/:listingId` read and manage it.
- `POST /marketplace/projects/:listingId/proposals` submits a proposal with a
  cover letter, optional budget, and delivery estimate. Owners shortlist,
  accept, or reject proposals with `PATCH /marketplace/projects/:listingId/proposals/:proposalId`;
  professionals can withdraw pending proposals. `GET /marketplace/projects/proposals/mine`
  tracks the caller's proposals.
- Application and proposal changes notify the other participant. Accepted work
  allows the client and professional to start a private conversation.

## Notifications

All routes require an authenticated, onboarded account and use private,
no-store caching.

- `GET /notifications` lists the caller's notifications.
- Notification types include `connection_request`, `connection_accepted`,
  `post_like`, `post_comment`, `post_shared`, `community_post`,
  `job_application`, `job_application_update`, `project_proposal`, and
  `project_proposal_update`.
- `GET /notifications/unread-count` returns `{ data: { count } }`.
- `PATCH /notifications/:notificationId/read` marks one notification read.
- `PATCH /notifications/read-all` marks all of the caller's notifications read
  and returns `{ data: { updatedCount } }`.
- `DELETE /notifications/:notificationId` deletes one of the caller's
  notifications (204).
- `DELETE /notifications` clears all notifications for the caller and returns
  `{ data: { deletedCount } }`.

## Private messaging

Messaging routes require an authenticated, onboarded account and use private,
no-store caching. A conversation can be started with an accepted connection or
with a profile visible to members; members can continue accessing an existing
conversation if profile visibility or connection status later changes.
Conversation membership is checked for every history and write request.

- `GET /messages/conversations?archived=false&limit=30&cursor=<conversation-id>`
  lists the caller's inbox (or archived conversations) with unread counts and
  the latest message preview.
- `POST /messages/conversations` with `{ "userId": "<user-id>" }` creates or
  returns the one-to-one conversation with an accepted connection.
- `GET /messages/conversations/:conversationId` reads a conversation summary.
- `GET /messages/conversations/:conversationId/messages?limit=40&cursor=<message-id>`
  returns a page of message history in chronological order. A cursor requests
  older messages.
- `POST /messages/conversations/:conversationId/messages` with
  `{ "content": "..." }` sends a message (1-5000 characters) and notifies the
  recipient.
- `PATCH /messages/conversations/:conversationId/read` updates read receipts
  and marks message notifications for that conversation as read.
- `DELETE /messages/conversations/:conversationId` archives it for the caller;
  `PATCH /messages/conversations/:conversationId/restore` restores it.
- `DELETE /messages/conversations/:conversationId/messages/:messageId` lets
  the caller delete a message for themselves with `{ "scope": "me" }`. The
  sender can use `{ "scope": "everyone" }` to remove their message for both
  participants; history keeps a deleted-message marker.
- `GET /messages/unread-count` returns `{ data: { count } }`.
- `GET /messages/events` is an authenticated Server-Sent Events stream for
  new/deleted messages, read receipts, conversation changes, and presence.
  Presence is tracked in the running server process and shared with accepted
  connections.
