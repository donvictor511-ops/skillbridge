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
