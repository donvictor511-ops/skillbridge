
#!/usr/bin/env bash
set -u

BASE="${API_BASE:-http://localhost:4000/api/v1}"
RUN_ID="$(date +%s)"
EMAIL_A="connections-a-${RUN_ID}@example.com"
EMAIL_B="connections-b-${RUN_ID}@example.com"
EMAIL_C="connections-c-${RUN_ID}@example.com"
NAME_A="Connection Test A ${RUN_ID}"
NAME_B="Connection Test B ${RUN_ID}"
NAME_C="Connection Test C ${RUN_ID}"
PASSWORD="blue-river-lamp-seven"

TMP_DIR="$(mktemp -d)"
JAR_A="$TMP_DIR/a.txt"
JAR_B="$TMP_DIR/b.txt"
JAR_C="$TMP_DIR/c.txt"
BODY="$TMP_DIR/body.txt"
HEADERS="$TMP_DIR/headers.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

PASS=0
FAIL=0
STATUS=""

ok() { PASS=$((PASS + 1)); echo "  PASS  $1"; }
bad() { FAIL=$((FAIL + 1)); echo "  FAIL  $1"; }

call() {
  local method="$1" path="$2" data="$3"
  shift 3

  local args=(-s -o "$BODY" -D "$HEADERS" -w "%{http_code}" \
    -X "$method" "$BASE$path")

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
    bad "$name (missing: $needle)"
  else
    ok "$name"
  fi
}

get_profile_id() {
  node -e '
    const fs = require("fs");
    const response = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const profile = response.data?.profiles?.find(
      (item) => item.displayName === process.argv[2]
    );

    if (!profile) process.exit(1);
    process.stdout.write(profile.userId);
  ' "$BODY" "$1"
}

get_connection_id() {
  node -e '
    const fs = require("fs");
    const response = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));

    if (!response.data?.id) process.exit(1);
    process.stdout.write(response.data.id);
  ' "$BODY"
}

section() { echo; echo "== $1 =="; }

call GET /health ""
if [ "$STATUS" != "200" ]; then
  echo "API unavailable. Start it with: npm run dev"
  exit 1
fi

echo "Testing connections API: $BASE"

section "1. Authentication and cache protection"

call GET /connections ""
check "Unauthenticated connections -> 401" 401 '"code":"UNAUTHENTICATED"'

if grep -qiE '^cache-control: .*no-store' "$HEADERS"; then
  ok "Connections response is not cacheable"
else
  bad "Connections response should have no-store cache header"
fi

section "2. Create three test users"

call POST /auth/register "{\"email\":\"${EMAIL_A}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_A"
check "Register user A -> 201" 201

call POST /onboarding "{\"capabilities\":[\"professional\"],\"displayName\":\"${NAME_A}\",\"headline\":\"Frontend Developer\",\"location\":\"Lagos\",\"skills\":[\"React\"],\"interests\":[\"software-development\"],\"goals\":[\"find-work\"]}" -b "$JAR_A"
check "Onboard user A -> 201" 201

call POST /auth/register "{\"email\":\"${EMAIL_B}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_B"
check "Register user B -> 201" 201

call POST /onboarding "{\"capabilities\":[\"client\"],\"displayName\":\"${NAME_B}\",\"headline\":\"Business Owner\",\"location\":\"Abuja\",\"skills\":[\"Marketing\"],\"interests\":[\"marketing\"],\"goals\":[\"hire-talent\"]}" -b "$JAR_B"
check "Onboard user B -> 201" 201

call POST /auth/register "{\"email\":\"${EMAIL_C}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_C"
check "Register user C -> 201" 201

call POST /onboarding "{\"capabilities\":[\"professional\"],\"displayName\":\"${NAME_C}\",\"headline\":\"Backend Developer\",\"location\":\"Benin City\",\"skills\":[\"Node.js\"],\"interests\":[\"software-development\"],\"goals\":[\"find-work\"]}" -b "$JAR_C"
check "Onboard user C -> 201" 201

section "3. Find test user IDs through discovery"

call GET /discover "" -b "$JAR_A"
check "User A can discover users -> 200" 200

B_ID="$(get_profile_id "$NAME_B")" || {
  echo "Could not find user B in discovery results."
  exit 1
}

C_ID="$(get_profile_id "$NAME_C")" || {
  echo "Could not find user C in discovery results."
  exit 1
}

call GET /discover "" -b "$JAR_B"
A_ID="$(get_profile_id "$NAME_A")" || {
  echo "Could not find user A in user B's discovery results."
  exit 1
}

ok "Retrieved all three user IDs"

section "4. Send and validate a connection request"

call POST "/connections/${B_ID}" "" -b "$JAR_A"
check "User A sends request to B -> 201" 201 '"status":"pending"'

CONNECTION_ID="$(get_connection_id)" || {
  echo "Could not read the new connection ID."
  exit 1
}

call POST "/connections/${B_ID}" "" -b "$JAR_A"
check "Duplicate pending request -> 409" 409 '"code":"CONNECTION_EXISTS"'

call POST "/connections/${A_ID}" "" -b "$JAR_A"
check "Cannot connect to yourself -> 400" 400 '"code":"SELF_CONNECTION"'

call PATCH "/connections/${CONNECTION_ID}/accept" "" -b "$JAR_A"
check "Requester cannot accept own request -> 403" 403 '"code":"NOT_REQUEST_RECIPIENT"'

section "5. Accept and list the connection"

call GET "/connections?status=pending" "" -b "$JAR_B"
check "Recipient sees pending request -> 200" 200 "\"displayName\":\"${NAME_A}\""

call PATCH "/connections/${CONNECTION_ID}/accept" "" -b "$JAR_B"
check "Recipient accepts request -> 200" 200 '"status":"accepted"'

call GET "/connections?status=accepted" "" -b "$JAR_A"
check "Accepted connection appears in list -> 200" 200 "\"displayName\":\"${NAME_B}\""

if grep -qiE '"email"|"passwordHash"|"goals"|"sessions"' "$BODY"; then
  bad "Connection list must not expose private account data"
else
  ok "Connection list does not expose private account data"
fi

call POST "/connections/${A_ID}" "" -b "$JAR_B"
check "Duplicate accepted connection -> 409" 409 '"code":"CONNECTION_EXISTS"'

section "6. Reject an incoming request"

call POST "/connections/${A_ID}" "" -b "$JAR_C"
check "User C sends request to A -> 201" 201 '"status":"pending"'

REJECT_CONNECTION_ID="$(get_connection_id)" || {
  echo "Could not read the rejection test connection ID."
  exit 1
}

call PATCH "/connections/${REJECT_CONNECTION_ID}/reject" "" -b "$JAR_A"
check "Recipient rejects request -> 200" 200 '"status":"rejected"'

call GET "/connections?status=rejected" "" -b "$JAR_C"
check "Rejected request appears in sender's list -> 200" 200 "\"displayName\":\"${NAME_A}\""

call POST "/connections/${A_ID}" "" -b "$JAR_C"
check "Cannot resend rejected request -> 409" 409 '"code":"CONNECTION_EXISTS"'

section "7. Remove an accepted connection"

call DELETE "/connections/${CONNECTION_ID}" "" -b "$JAR_A"
check "Participant removes accepted connection -> 204" 204

call GET "/connections?status=accepted" "" -b "$JAR_A"
check "Removed connection no longer appears -> 200" 200

if grep -qF "$CONNECTION_ID" "$BODY"; then
  bad "Removed connection should not appear in the list"
else
  ok "Removed connection is absent from the list"
fi

echo
echo "Passed: $PASS    Failed: $FAIL"
echo
echo "Test accounts created:"
echo "  $EMAIL_A"
echo "  $EMAIL_B"
echo "  $EMAIL_C"
echo "Clean them up after testing if desired."

[ "$FAIL" -eq 0 ]
