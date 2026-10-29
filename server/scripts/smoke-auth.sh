#!/usr/bin/env bash
# Smoke test for the SkillBridge auth API.

set -u

BASE="${API_BASE:-http://localhost:4000/api/v1}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-http://localhost:5173}"
RUN_ID="$(date +%s)"
EMAIL_A="smoke-a-${RUN_ID}@example.com"
EMAIL_B="smoke-b-${RUN_ID}@example.com"
EMAIL_C="smoke-c-${RUN_ID}@example.com"
PASSWORD="blue-river-lamp-seven"

TMP_DIR="$(mktemp -d)"
JAR_A="$TMP_DIR/a.txt"
JAR_A_COPY="$TMP_DIR/a-copy.txt"
JAR_B="$TMP_DIR/b.txt"
BODY="$TMP_DIR/body.txt"
HEADERS="$TMP_DIR/headers.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

PASS=0
FAIL=0
STATUS=""

ok() {
  PASS=$((PASS + 1))
  echo "  PASS  $1"
}

bad() {
  FAIL=$((FAIL + 1))
  echo "  FAIL  $1"
}

section() {
  echo
  echo "== $1 =="
}

call() {
  local method="$1" path="$2" data="$3"
  shift 3
  local args=(-s -o "$BODY" -D "$HEADERS" -w "%{http_code}" -X "$method" "$BASE$path")
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  STATUS="$(curl "${args[@]}" "$@")"
}

check() {
  local name="$1" expected="$2" needle="${3:-}"
  if [ "$STATUS" != "$expected" ]; then
    bad "$name (status $STATUS, expected $expected)"
  elif [ -n "$needle" ] && ! grep -qF -- "$needle" "$BODY"; then
    bad "$name (body should contain: $needle)"
  else
    ok "$name"
  fi
}

assert_header() {
  if grep -qiE -- "$1" "$HEADERS"; then ok "$2"; else bad "$2"; fi
}

assert_no_header() {
  if grep -qi -- "^$1:" "$HEADERS"; then bad "$2"; else ok "$2"; fi
}

assert_body_lacks() {
  if grep -qiF -- "$1" "$BODY"; then bad "$2"; else ok "$2"; fi
}

call GET /health ""
if [ "$STATUS" != "200" ]; then
  echo "Cannot reach the API at $BASE (status $STATUS)."
  echo "Start it first with: npm run dev"
  exit 1
fi
echo "Testing $BASE"
echo "Test accounts: $EMAIL_A, $EMAIL_B"

section "1. Registration: invalid input is rejected"

call POST /auth/register '{"email":"not-an-email","password":"short"}'
check "bad email and short password -> 400" 400 '"code":"VALIDATION_ERROR"'

call POST /auth/register "{\"email\":\"${EMAIL_C}\",\"password\":\"password1234\"}"
check "very common password -> 400" 400 'too common'

call POST /auth/register '{bad json'
check "broken JSON -> 400 INVALID_JSON" 400 '"code":"INVALID_JSON"'

call POST /auth/register ''
check "missing body -> 400" 400 '"code":"VALIDATION_ERROR"'

BIG="$(head -c 20000 /dev/zero | tr '\0' 'a')"
call POST /auth/register "{\"email\":\"${EMAIL_C}\",\"password\":\"${BIG}\"}"
check "body over 10 KB -> 413" 413 '"code":"PAYLOAD_TOO_LARGE"'

section "2. Registration: success, safe response, and ignored extras"

call POST /auth/register "{\"email\":\"${EMAIL_A}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_A"
check "valid registration -> 201" 201 "\"email\":\"${EMAIL_A}\""
USER_A_ID="$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' "$BODY")"
assert_body_lacks "password" "response has no password or password hash"
assert_body_lacks "argon2" "response has no hash text"
assert_header "^set-cookie: sb_session=.*HttpOnly" "session cookie is HttpOnly"
assert_header "^set-cookie: sb_session=.*SameSite=Lax" "session cookie is SameSite=Lax"
assert_no_header "x-powered-by" "server does not advertise Express"

call POST /auth/register "{\"email\":\"${EMAIL_B}\",\"password\":\"${PASSWORD}\",\"capabilities\":[\"client\"],\"onboardedAt\":\"2020-01-01T00:00:00Z\",\"isAdmin\":true}" -c "$JAR_B"
check "registration with extra fields -> 201" 201
call GET /auth/me "" -b "$JAR_B"
check "extra fields were ignored (no capabilities, not onboarded)" 200 '"capabilities":[],"onboardedAt":null'

section "3. Duplicate email"

UPPER_EMAIL_A="$(echo "$EMAIL_A" | tr 'a-z' 'A-Z')"
call POST /auth/register "{\"email\":\"${UPPER_EMAIL_A}\",\"password\":\"${PASSWORD}\"}"
check "same email in capitals -> 409" 409 '"code":"EMAIL_ALREADY_REGISTERED"'

section "4. Login failures reveal nothing extra"

call POST /auth/login "{\"email\":\"${EMAIL_A}\",\"password\":\"wrong-password-123\"}"
check "wrong password -> 401" 401 '"code":"INVALID_CREDENTIALS"'
WRONG_PASSWORD_BODY="$(cat "$BODY")"

call POST /auth/login "{\"email\":\"nobody-${RUN_ID}@example.com\",\"password\":\"wrong-password-123\"}"
check "unknown email -> 401" 401 '"code":"INVALID_CREDENTIALS"'
if [ "$(cat "$BODY")" = "$WRONG_PASSWORD_BODY" ]; then
  ok "wrong password and unknown email give the IDENTICAL response"
else
  bad "wrong password and unknown email give different responses"
fi

call POST /auth/login "{\"email\":\"${EMAIL_A}\"}"
check "missing password -> 400" 400 '"code":"VALIDATION_ERROR"'

section "5. Unauthorized access (no website involved)"

call GET /auth/me ""
check "/me without a cookie -> 401" 401 '"code":"UNAUTHENTICATED"'

call GET /auth/me "" -b "sb_session=this-is-not-a-real-session"
check "/me with a made-up cookie -> 401" 401 '"code":"UNAUTHENTICATED"'

call POST /onboarding '{"capabilities":["professional"],"displayName":"Intruder","skills":[],"interests":[],"goals":["learn"]}'
check "onboarding without logging in -> 401" 401 '"code":"UNAUTHENTICATED"'

section "6. Login, logout, and replaying an old cookie"

call POST /auth/login "{\"email\":\"${EMAIL_A}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_A"
check "correct password -> 200" 200 "\"email\":\"${EMAIL_A}\""

call GET /auth/me "" -b "$JAR_A"
check "/me with the session cookie -> 200" 200 "\"email\":\"${EMAIL_A}\""

cp "$JAR_A" "$JAR_A_COPY"

call POST /auth/logout "" -b "$JAR_A" -c "$JAR_A"
check "logout -> 204" 204

call GET /auth/me "" -b "$JAR_A"
check "/me after logout -> 401" 401

call GET /auth/me "" -b "$JAR_A_COPY"
check "replaying the OLD cookie after logout -> 401" 401 '"code":"UNAUTHENTICATED"'

section "7. Onboarding trusts the session, not the client"

call POST /auth/login "{\"email\":\"${EMAIL_A}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_A"
check "log user A in again -> 200" 200

call POST /onboarding '{"capabilities":["admin"],"displayName":"","skills":["<b>"],"interests":["cooking"],"goals":[]}' -b "$JAR_A"
check "invalid onboarding values -> 400" 400 '"code":"VALIDATION_ERROR"'

call POST /onboarding "{\"userId\":\"${USER_A_ID}\",\"capabilities\":[\"client\"],\"displayName\":\"Bee\",\"skills\":[\"React\"],\"interests\":[],\"goals\":[\"hire-talent\"]}" -b "$JAR_B"
check "user B onboarding (extra userId ignored) -> 201" 201 '"capabilities":["client"]'

call GET /auth/me "" -b "$JAR_A"
check "user A is still NOT onboarded" 200 '"onboardedAt":null'

ONBOARD_A='{"capabilities":["professional"],"displayName":"Ada","headline":"Engineer","skills":["React","typescript","TypeScript"],"interests":["software-development"],"goals":["find-work"]}'
call POST /onboarding "$ONBOARD_A" -b "$JAR_A"
check "user A can still onboard -> 201" 201 '"capabilities":["professional"]'

call POST /onboarding "$ONBOARD_A" -b "$JAR_A"
check "repeat onboarding -> 409" 409 '"code":"ONBOARDING_ALREADY_COMPLETED"'

section "8. CORS: only our own website may use the API from a browser"

call GET /health "" -H "Origin: http://evil.example"
assert_no_header "access-control-allow-origin" "an unknown website gets no permission header"

call GET /health "" -H "Origin: ${ALLOWED_ORIGIN}"
assert_header "^access-control-allow-origin: ${ALLOWED_ORIGIN}" "our own origin is allowed"
assert_header "^access-control-allow-credentials: true" "cookies are allowed for our own origin"

section "9. Errors are safe and consistent"

call GET /does-not-exist ""
check "unknown route -> 404 in our error shape" 404 '"code":"NOT_FOUND"'
assert_body_lacks "node_modules" "no file paths or stack traces in the error"

echo
echo "Passed: ${PASS}    Failed: ${FAIL}"
echo
echo "Clean up the test data in SQL Shell:"
echo "  DELETE FROM users WHERE email LIKE 'smoke-%@example.com';"
echo "  DELETE FROM skills WHERE id NOT IN (SELECT skill_id FROM user_skills);"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi