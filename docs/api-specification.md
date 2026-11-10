# API Specification

Base path: `/api/v1`. Success: `{ "data": ... }`.
Error: `{ "error": { "code", "message", "details?" } }`.

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
  goals, visibility, or timestamps.

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
