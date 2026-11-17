
#!/usr/bin/env bash
# Smoke test for the profile API.
#
# 1. Start the API:           npm run dev                  (in server/)
# 2. In another terminal:     npm run test:smoke:profiles  (in server/)
#
# It talks to the API directly with curl. It never uses the React app.

set -u

BASE="${API_BASE:-http://localhost:4000/api/v1}"
RUN_ID="$(date +%s)"
EMAIL_A="prof-a-${RUN_ID}@example.com"
EMAIL_B="prof-b-${RUN_ID}@example.com"
PASSWORD="blue-river-lamp-seven"

TMP_DIR="$(mktemp -d)"
JAR_A="$TMP_DIR/a.txt"
JAR_B="$TMP_DIR/b.txt"
BODY="$TMP_DIR/body.txt"
HEADERS="$TMP_DIR/headers.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

PASS=0
FAIL=0
STATUS=""

ok() { PASS=$((PASS + 1)); echo "  PASS  $1"; }
bad() { FAIL=$((FAIL + 1)); echo "  FAIL  $1"; }
section() { echo; echo "== $1 =="; }

# call METHOD PATH JSON_BODY [extra curl arguments...]
call() {
  local method="$1" path="$2" data="$3"
  shift 3
  local args=(-s -o "$BODY" -D "$HEADERS" -w "%{http_code}" -X "$method" "$BASE$path")
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  STATUS="$(curl "${args[@]}" "$@")"
}

# check DESCRIPTION EXPECTED_STATUS [TEXT_THE_BODY_MUST_CONTAIN]
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

assert_body_lacks() {
  if grep -qiF -- "$1" "$BODY"; then bad "$2"; else ok "$2"; fi
}

assert_header() {
  if grep -qiE -- "$1" "$HEADERS"; then ok "$2"; else bad "$2"; fi
}

call GET /health ""
if [ "$STATUS" != "200" ]; then
  echo "Cannot reach the API at $BASE (status $STATUS)."
  echo "Start it first with: npm run dev"
  exit 1
fi
echo "Testing $BASE"

section "1. GET /profiles/me needs a login"
call GET /profiles/me ""
check "/profiles/me without a cookie -> 401" 401 '"code":"UNAUTHENTICATED"'

section "2. Set up two users"
call POST /auth/register "{\"email\":\"${EMAIL_A}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_A"
check "register user A -> 201" 201
USER_A_ID="$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' "$BODY")"

call POST /onboarding '{"capabilities":["professional"],"displayName":"Ada Lovelace","headline":"Software engineer","location":"Lagos","skills":["React","TypeScript"],"interests":["software-development"],"goals":["find-work"]}' -b "$JAR_A"
check "onboard user A -> 201" 201

call POST /auth/register "{\"email\":\"${EMAIL_B}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_B"
check "register user B -> 201" 201

section "3. GET /profiles/me (the owner view)"
call GET /profiles/me "" -b "$JAR_A"
check "owner gets their profile -> 200" 200 '"displayName":"Ada Lovelace"'
check "owner view shows visibility (default members)" 200 '"visibility":"members"'
check "owner view includes private goals" 200 '"goals":["find-work"]'
assert_body_lacks "@example.com" "owner view does not contain the email address"
assert_header "^cache-control: .*no-store" "profile responses are not cacheable"

section "4. GET /profiles/:userId (members visibility)"
call GET "/profiles/${USER_A_ID}" ""
check "logged-out visitor -> 401 LOGIN_REQUIRED" 401 '"code":"LOGIN_REQUIRED"'

call GET "/profiles/${USER_A_ID}" "" -b "$JAR_B"
check "another logged-in user -> 200" 200 '"displayName":"Ada Lovelace"'
assert_body_lacks '"goals"' "visitor view has no goals"
assert_body_lacks '"visibility"' "visitor view has no visibility setting"

section "5. Visibility changes"
call PATCH /profiles/me '{"visibility":"public"}' -b "$JAR_A"
check "owner makes the profile public -> 200" 200 '"visibility":"public"'
call GET "/profiles/${USER_A_ID}" ""
check "logged-out visitor can now see it -> 200" 200

call PATCH /profiles/me '{"visibility":"private"}' -b "$JAR_A"
check "owner makes the profile private -> 200" 200
call GET "/profiles/${USER_A_ID}" ""
check "logged-out visitor -> 404" 404 '"code":"PROFILE_NOT_FOUND"'
call GET "/profiles/${USER_A_ID}" "" -b "$JAR_B"
check "another user -> 404" 404 '"code":"PROFILE_NOT_FOUND"'
call GET "/profiles/${USER_A_ID}" "" -b "$JAR_A"
check "the owner can still see it -> 200" 200

section "6. Invalid input and unknown profiles"
call PATCH /profiles/me '{"avatarUrl":"javascript:alert(1)"}' -b "$JAR_A"
check "javascript: link -> 400" 400 '"code":"VALIDATION_ERROR"'

# A null headline means the user wants to clear the existing headline.
call PATCH /profiles/me '{"headline":null}' -b "$JAR_A"
check "clearing headline with null -> 200" 200 '"headline":null'

# displayName is required and should reject null.
call PATCH /profiles/me '{"displayName":null}' -b "$JAR_A"
check "displayName null -> 400" 400 '"code":"VALIDATION_ERROR"'

# visibility must be a valid visibility value and should reject null.
call PATCH /profiles/me '{"visibility":null}' -b "$JAR_A"
check "visibility null -> 400" 400 '"code":"VALIDATION_ERROR"'

call PATCH /profiles/me '{}' -b "$JAR_A"
check "empty update -> 400" 400 '"code":"VALIDATION_ERROR"'
call GET /profiles/not-a-uuid ""
check "malformed id -> 404" 404 '"code":"PROFILE_NOT_FOUND"'

section "7. Replacing skills"
call PUT /profiles/me/skills '{"skills":["Node.js","react"]}' -b "$JAR_A"
check "replace skills -> 200" 200 '"name":"Node.js"'

echo
echo "Passed: ${PASS}    Failed: ${FAIL}"
echo
echo "Clean up the test data in SQL Shell:"
echo "  DELETE FROM users WHERE email LIKE 'prof-%@example.com';"
echo "  DELETE FROM skills WHERE id NOT IN (SELECT skill_id FROM user_skills)"
echo "    AND id NOT IN (SELECT skill_id FROM portfolio_project_skills);"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
